const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authJwt = require("../middleware/authJwt");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const StockAlert = require("../models/StockAlert");
const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");
const { sanitizeProfanity } = require("../services/profanityFilter");
const {
  isCloudImageStorageEnabled,
  uploadLocalFileToCloudinary,
  uploadBase64ToCloudinary,
} = require("../services/imageStorage");
const config = require("../config");

const router = express.Router();

const uploadPath = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const safeBase = path
      .parse(file.originalname)
      .name.replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    // Base64 payloads for web can be large; allow bigger multipart text fields.
    fieldSize: 200 * 1024 * 1024,
    fields: 50,
  },
});

const uploadReviewImages = upload.array("images", 3);
const uploadProductImages = upload.array("images", 10);

const STOCK_LOW_THRESHOLD = 10;

async function notifyAdmins(title, body, data) {
  try {
    const admins = await User.find({ isAdmin: true, pushToken: { $ne: "" } }, "pushToken pushTokenType").lean();
    const tokens = admins
      .filter((a) => a.pushToken)
      .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
    console.log(`[notifyAdmins] Sending to ${tokens.length} admin(s): "${title}"`);
    await sendToTokens(tokens, { title, body, data: data || {} });
  } catch (error) {
    console.error('[notifyAdmins] Error:', error.message);
  }
}

async function notifyCustomersAboutStock(product, alertType) {
  try {
    // Send notification to customers about low stock (only for out of stock)
    if (alertType === "out") {
      const customers = await User.find(
        { isAdmin: false, pushToken: { $ne: "" } },
        "pushToken pushTokenType"
      ).lean();
      const tokens = customers
        .filter((u) => u.pushToken)
        .map((u) => ({ token: u.pushToken, type: u.pushTokenType || "fcm" }));
      
      if (tokens.length > 0) {
        console.log(
          `[notifyCustomersAboutStock] Sending out-of-stock alert for "${product.name}" to ${tokens.length} customer(s)`
        );
        await sendToTokens(tokens, {
          title: "Stock Update",
          body: `${product.name} is out of stock, but check back soon!`,
          data: { route: "notifications", type: "stock", productId: product._id?.toString() },
        });
      }
    }
  } catch (error) {
    console.error('[notifyCustomersAboutStock] Error:', error.message);
  }
}

async function updateStockAlerts(product) {
  const count = Number(product.countInStock || 0);
  const productId = product._id;
  const productName = product.name || "Product";

  if (count <= 0) {
    await StockAlert.updateMany(
      { product: productId, resolved: false, type: "low" },
      { resolved: true }
    );
    const existingOut = await StockAlert.findOne({ product: productId, resolved: false, type: "out" });
    if (!existingOut) {
      await StockAlert.create({
        product: productId,
        type: "out",
        threshold: STOCK_LOW_THRESHOLD,
        countInStock: count,
      });
      await notifyAdmins("Out of stock", `${productName} is out of stock.`);
      await notifyCustomersAboutStock(product, "out");
    } else if (existingOut.countInStock !== count) {
      existingOut.countInStock = count;
      await existingOut.save();
    }
    return;
  }

  if (count <= STOCK_LOW_THRESHOLD) {
    await StockAlert.updateMany(
      { product: productId, resolved: false, type: "out" },
      { resolved: true }
    );
    const existingLow = await StockAlert.findOne({ product: productId, resolved: false, type: "low" });
    if (!existingLow) {
      await StockAlert.create({
        product: productId,
        type: "low",
        threshold: STOCK_LOW_THRESHOLD,
        countInStock: count,
      });
      await notifyAdmins("Low stock", `${productName} is low on stock (${count}).`, {
        route: "admin-stock-alerts",
        productId: productId.toString(),
        count,
      });
    } else if (existingLow.countInStock !== count) {
      existingLow.countInStock = count;
      await existingLow.save();
    }
    return;
  }

  await StockAlert.updateMany(
    { product: productId, resolved: false },
    { resolved: true }
  );
}

function buildImageUrl(req, filename) {
  if (!filename) return "";
  const forwardedProto = String(req.get("x-forwarded-proto") || "").trim();
  const protocol = forwardedProto || req.protocol || "http";
  return `${protocol}://${req.get("host")}/${config.uploadDir}/${filename}`;
}

function normalizeUploadUrl(value, req) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const marker = `/${config.uploadDir}/`;
  const idx = raw.indexOf(marker);
  if (idx === -1) return raw;

  const filePart = raw.slice(idx + marker.length);
  if (!filePart) return raw;

  return buildImageUrl(req, filePart);
}

function withNormalizedProductImages(product, req) {
  if (!product) return product;

  const plain = typeof product.toObject === "function" ? product.toObject() : { ...product };
  plain.image = normalizeUploadUrl(plain.image, req);

  if (Array.isArray(plain.images)) {
    plain.images = plain.images.map((img) => normalizeUploadUrl(img, req));
  }

  return plain;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function parseJsonArray(raw) {
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function uniqStrings(values) {
  const out = [];
  const seen = new Set();
  for (const v of values || []) {
    const s = String(v || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function isHttpUrl(value) {
  const s = String(value || "").trim();
  return s.startsWith("http://") || s.startsWith("https://");
}

async function uploadMultipartFilesToStorage(files, req, folderSuffix = "products") {
  const out = [];
  for (const file of files || []) {
    if (isCloudImageStorageEnabled()) {
      try {
        const cloudUrl = await uploadLocalFileToCloudinary(file.path, folderSuffix);
        if (isHttpUrl(cloudUrl)) out.push(cloudUrl);
      } catch (error) {
        console.warn("[products] Cloud upload failed for multipart file, falling back to local:", error.message);
        out.push(buildImageUrl(req, file.filename));
      } finally {
        // Clean temporary local file after cloud upload attempt.
        try {
          if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {
          // Best effort cleanup.
        }
      }
    } else {
      out.push(buildImageUrl(req, file.filename));
    }
  }
  return out;
}

async function materializeBase64Images(raw, req, folderSuffix = "products") {
  const arr = parseJsonArray(raw);
  if (!Array.isArray(arr) || arr.length === 0) return [];

  const written = [];
  for (const entry of arr) {
    let data = String(entry?.data || "").trim();
    if (!data) continue;
    // Support either raw base64 or dataURL base64 (data:image/*;base64,....)
    const commaIdx = data.indexOf(",");
    if (data.startsWith("data:") && commaIdx >= 0) {
      data = data.slice(commaIdx + 1);
    }
    const mime = String(entry?.mime || "image/jpeg");

    if (isCloudImageStorageEnabled()) {
      try {
        const cloudUrl = await uploadBase64ToCloudinary(data, mime, folderSuffix);
        if (isHttpUrl(cloudUrl)) written.push(cloudUrl);
        continue;
      } catch (error) {
        console.warn("[products] Cloud upload failed for base64 image, falling back to local:", error.message);
      }
    }

    const ext = mime.includes("png") ? ".png" : ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const buffer = Buffer.from(data, "base64");
    const filepath = path.join(uploadPath, filename);
    try {
      fs.writeFileSync(filepath, buffer);
      written.push(buildImageUrl(req, filename));
    } catch (error) {
      console.warn("[products] Failed to write base64 image:", error.message);
    }
  }
  return written;
}

async function refreshProductReviewStats(productId) {
  const aggregation = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (!aggregation.length) {
    await Product.findByIdAndUpdate(productId, { rating: 0, numReviews: 0 });
    return;
  }

  const avgRating = Number(aggregation[0].avgRating || 0);
  const rounded = Math.round(avgRating * 10) / 10;
  const totalReviews = Number(aggregation[0].totalReviews || 0);

  await Product.findByIdAndUpdate(productId, {
    rating: rounded,
    numReviews: totalReviews,
  });
}

function toObjectIdOrNull(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function getReviewSort(sortKey) {
  const key = String(sortKey || "date_desc").toLowerCase();
  if (key === "date_asc") return { createdAt: 1 };
  if (key === "rating_desc") return { rating: -1, createdAt: -1 };
  if (key === "rating_asc") return { rating: 1, createdAt: -1 };
  return { createdAt: -1 };
}

async function findDeliveredOrderForReview(userId, orderId, productId) {
  if (!userId || !orderId || !productId) return null;

  return Order.findOne({
    _id: orderId,
    user: userId,
    status: "delivered",
    "orderItems.product": productId,
  }).lean();
}

// GET /products — public, used by home screen
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate("category", "id name color");
    return res.status(200).json(products.map((p) => withNormalizedProductImages(p, req)));
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load products" });
  }
});

// GET /products/search — full-text search for products by name
router.get("/search/query", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Search by product name (case-insensitive regex)
    const products = await Product.find({
      name: { $regex: query, $options: "i" }
    })
      .populate("category", "id name color")
      .limit(20);

    return res.status(200).json(products.map((p) => withNormalizedProductImages(p, req)));
  } catch (_error) {
    return res.status(500).json({ message: "Failed to search products" });
  }
});

// GET /products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "id name color");
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.status(200).json(withNormalizedProductImages(product, req));
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load product" });
  }
});

// GET /products/:id/reviews — public list with filters
router.get("/:id/reviews", async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    if (!productId) return res.status(400).json({ message: "Invalid product id" });

    const ratingFilter = Number(req.query.rating || 0);
    const withMedia = parseBoolean(req.query.withMedia, false);
    const filter = { product: productId };

    if (Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5) {
      filter.rating = ratingFilter;
    }
    if (withMedia) {
      filter["images.0"] = { $exists: true };
    }

    const reviews = await Review.find(filter)
      .populate("user", "id name image")
      .sort(getReviewSort(req.query.sort));

    return res.status(200).json(reviews);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load reviews" });
  }
});

// GET /products/:id/reviews/me?orderId=... — current user's review for a specific order/product pair
router.get("/:id/reviews/me", authJwt, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    const orderId = toObjectIdOrNull(req.query.orderId);
    if (!productId || !orderId) {
      return res.status(400).json({ message: "productId and orderId are required" });
    }

    const review = await Review.findOne({
      product: productId,
      order: orderId,
      user: req.user.userId,
    });

    return res.status(200).json({ review: review || null });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load review" });
  }
});

// GET /products/:id/reviews/eligibility?orderId=... — can current user review this product/order pair?
router.get("/:id/reviews/eligibility", authJwt, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    const orderId = toObjectIdOrNull(req.query.orderId);
    if (!productId || !orderId) {
      return res.status(400).json({ message: "productId and orderId are required" });
    }

    const deliveredOrder = await findDeliveredOrderForReview(req.user.userId, orderId, productId);
    if (!deliveredOrder) {
      return res.status(200).json({
        canReview: false,
        reason: "Review is allowed only for products in your delivered orders",
        hasReview: false,
      });
    }

    const existing = await Review.findOne({
      product: productId,
      order: orderId,
      user: req.user.userId,
    }).lean();

    return res.status(200).json({
      canReview: true,
      reason: null,
      hasReview: Boolean(existing),
      reviewId: existing?.id || existing?._id || null,
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to evaluate review eligibility" });
  }
});

// POST /products/:id/reviews — create review (auth, max 3 images)
router.post("/:id/reviews", authJwt, uploadReviewImages, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    if (!productId) return res.status(400).json({ message: "Invalid product id" });

    const orderId = toObjectIdOrNull(req.body.orderId);
    const rating = Number(req.body.rating);
    const comment = sanitizeProfanity(String(req.body.comment || "").trim());

    if (!orderId) return res.status(400).json({ message: "orderId is required" });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (!comment) return res.status(400).json({ message: "Comment is required" });

    const deliveredOrder = await findDeliveredOrderForReview(req.user.userId, orderId, productId);

    if (!deliveredOrder) {
      return res.status(403).json({
        message: "You can only review products from your delivered orders",
      });
    }

    const existing = await Review.findOne({
      product: productId,
      order: orderId,
      user: req.user.userId,
    }).lean();

    if (existing) {
      return res.status(409).json({
        message: "You already submitted a review for this product in this order",
      });
    }

    const uploadedImages = await uploadMultipartFilesToStorage(req.files || [], req, "reviews");
    const base64Images = await materializeBase64Images(req.body.imagesBase64, req, "reviews");
    const images = [...uploadedImages, ...base64Images].slice(0, 3);

    const review = await Review.create({
      product: productId,
      order: orderId,
      user: req.user.userId,
      rating,
      comment,
      images,
    });

    await refreshProductReviewStats(productId);

    // Send push notification to the reviewer confirming submission
    try {
      const reviewer = await User.findById(req.user.userId).select("pushToken pushTokenType");
      if (reviewer?.pushToken) {
        // Create notification record
        await Notification.create({
          user: req.user.userId,
          type: "order_status",
          title: "Review Submitted",
          message: "Your product review has been submitted successfully",
          orderId: orderId,
          orderStatus: "reviewed",
          data: { orderId: orderId.toString(), productId: productId.toString() },
        });

        // Send push notification
        await sendToTokens(
          [{ token: reviewer.pushToken, type: reviewer.pushTokenType || "fcm" }],
          {
            title: "Review Submitted",
            body: "Your product review was successfully submitted",
            data: {
              route: "order-details",
              orderId: orderId.toString(),
              type: "review_created",
            },
          }
        );
        console.log(`[POST /products/:id/reviews] Notification sent to reviewer ${req.user.userId}`);
      }
    } catch (notifError) {
      console.warn(
        `[POST /products/:id/reviews] Failed to send review creation notification:`,
        notifError.message
      );
      // Don't fail the request if notification fails
    }

    const populated = await review.populate("user", "id name image");
    return res.status(201).json(populated);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Review already exists for this order" });
    }
    return res.status(500).json({ message: "Failed to create review" });
  }
});

// PUT /products/:id/reviews/:reviewId — update own review only
async function updateReviewHandler(req, res) {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    const reviewId = toObjectIdOrNull(req.params.reviewId);
    if (!productId || !reviewId) return res.status(400).json({ message: "Invalid id" });

    const review = await Review.findOne({ _id: reviewId, product: productId });
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You can edit only your own review" });
    }

    const deliveredOrder = await findDeliveredOrderForReview(
      req.user.userId,
      review.order,
      productId
    );
    if (!deliveredOrder) {
      return res.status(403).json({
        message: "You can edit reviews only for products in your delivered orders",
      });
    }

    if (req.body.rating !== undefined) {
      const rating = Number(req.body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      review.rating = rating;
    }

    if (req.body.comment !== undefined) {
      review.comment = sanitizeProfanity(String(req.body.comment || "").trim());
    }

    let retainedImages = review.images;
    if (req.body.existingImages !== undefined) {
      const rawExisting = req.body.existingImages;
      let parsed = [];

      if (Array.isArray(rawExisting)) {
        parsed = rawExisting;
      } else if (typeof rawExisting === "string") {
        try {
          parsed = JSON.parse(rawExisting);
        } catch {
          parsed = [];
        }
      }

      if (Array.isArray(parsed)) {
        retainedImages = parsed
          .map((img) => String(img || "").trim())
          .filter(Boolean);
      }
    }

    const uploadedImages = await uploadMultipartFilesToStorage(req.files || [], req, "reviews");
    const base64Images = await materializeBase64Images(req.body.imagesBase64, req, "reviews");
    review.images = [...retainedImages, ...uploadedImages, ...base64Images].slice(0, 3);

    await review.save();
    await refreshProductReviewStats(productId);

    // Send push notification to the reviewer about their review update
    try {
      const reviewer = await User.findById(req.user.userId).select("pushToken pushTokenType");
      if (reviewer?.pushToken) {
        // Create notification record
        await Notification.create({
          user: req.user.userId,
          type: "order_status",
          title: "Review Updated",
          message: "Your product review has been updated successfully",
          orderId: review.order,
          orderStatus: "reviewed",
          data: { orderId: review.order?.toString(), productId: productId.toString() },
        });

        // Send push notification with order details
        await sendToTokens(
          [{ token: reviewer.pushToken, type: reviewer.pushTokenType || "fcm" }],
          {
            title: "Review Updated",
            body: "Your review was successfully updated",
            data: {
              route: "order-details",
              orderId: review.order?.toString(),
              type: "review_updated",
            },
          }
        );
        console.log(`[PUT /products/:id/reviews/:reviewId] Notification sent to reviewer ${req.user.userId}`);
      }
    } catch (notifError) {
      console.warn(
        `[PUT /products/:id/reviews/:reviewId] Failed to send review update notification:`,
        notifError.message
      );
      // Don't fail the request if notification fails
    }

    const populated = await review.populate("user", "id name image");
    return res.status(200).json(populated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update review" });
  }
}

// PUT /products/:id/reviews/:reviewId — update own review only
router.put("/:id/reviews/:reviewId", authJwt, uploadReviewImages, updateReviewHandler);

// POST alias for mobile multipart clients that fail on PUT + FormData.
router.post("/:id/reviews/:reviewId", authJwt, uploadReviewImages, updateReviewHandler);

// POST /products — admin only, multipart
router.post("/", authJwt, uploadProductImages, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured, image } = req.body;
    if (!name || !brand || !price || !category || countInStock === undefined) {
      return res.status(400).json({ message: "name, brand, price, category and countInStock are required" });
    }

    // Process uploaded images (multipart + optional base64 from mobile)
    const incomingFilesCount = (req.files || []).length;
    const incomingBase64Count = Array.isArray(parseJsonArray(req.body.imagesBase64))
      ? parseJsonArray(req.body.imagesBase64).length
      : 0;
    console.log(
      `[POST /products] files=${incomingFilesCount}, base64=${incomingBase64Count}`
    );

    const fileUrls = (await uploadMultipartFilesToStorage(req.files || [], req, "products"))
      .filter(isHttpUrl);
    const base64Urls = await materializeBase64Images(req.body.imagesBase64, req, "products");
    const imageUrls = uniqStrings([...fileUrls, ...base64Urls].filter(isHttpUrl));
    
    // Use first uploaded image as main image, or fallback to provided image field
    const mainImage = imageUrls.length > 0 ? imageUrls[0] : (isHttpUrl(image) ? image : "");
    
    const product = await Product.create({
      name, brand, price: Number(price), description, richDescription,
      category, countInStock: Number(countInStock),
      rating: Number(rating || 0), numReviews: Number(numReviews || 0),
      isFeatured: isFeatured === "true" || isFeatured === true,
      image: mainImage,
      images: imageUrls,
    });
    const populated = await product.populate("category", "id name color");
    await updateStockAlerts(product);
    return res.status(201).json(populated);
  } catch (error) {
    console.error('[POST /products] Error:', error.message);
    return res.status(500).json({ message: "Failed to create product" });
  }
});

// PUT /products/:id — admin only, multipart
router.put("/:id", authJwt, uploadProductImages, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured } = req.body;
    
    // Process uploaded images (multipart + optional base64 from mobile/web)
    const uploadedFileUrls = (await uploadMultipartFilesToStorage(req.files || [], req, "products"))
      .filter(isHttpUrl);
    const uploadedBase64Urls = await materializeBase64Images(req.body.imagesBase64, req, "products");
    console.log(
      `[PUT /products] uploaded files=${(req.files || []).length}, base64=${Array.isArray(parseJsonArray(req.body.imagesBase64)) ? parseJsonArray(req.body.imagesBase64).length : 0}`
    );
    const uploadedImageUrls = uniqStrings([...uploadedFileUrls, ...uploadedBase64Urls].filter(isHttpUrl));
    
    // Retain existing images if requested (default: keep all existing)
    const requestedExisting = parseJsonArray(req.body.existingImages);
    const retainedExisting = Array.isArray(requestedExisting)
      ? requestedExisting
      : (existing.images || []);
    const retainedExistingHttpOnly = uniqStrings((retainedExisting || []).filter(isHttpUrl));

    // Merge retained existing + uploaded new images
    const mergedImages = uniqStrings([...(retainedExistingHttpOnly || []), ...(uploadedImageUrls || [])]).slice(0, 10);

    // Pick main image: prefer an explicit existing URL, else first uploaded, else existing.image
    const mainImageUrl = String(req.body.mainImageUrl || "").trim();
    const finalMainImage =
      (mainImageUrl && mergedImages.includes(mainImageUrl))
        ? mainImageUrl
        : (uploadedImageUrls.length > 0
          ? uploadedImageUrls[0]
          : (isHttpUrl(existing.image) ? existing.image : (mergedImages[0] || "")));

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name || existing.name,
        brand: brand || existing.brand,
        price: price !== undefined ? Number(price) : existing.price,
        description: description !== undefined ? description : existing.description,
        richDescription: richDescription !== undefined ? richDescription : existing.richDescription,
        category: category || existing.category,
        countInStock: countInStock !== undefined ? Number(countInStock) : existing.countInStock,
        rating: rating !== undefined ? Number(rating) : existing.rating,
        numReviews: numReviews !== undefined ? Number(numReviews) : existing.numReviews,
        isFeatured: isFeatured !== undefined ? (isFeatured === "true" || isFeatured === true) : existing.isFeatured,
        image: finalMainImage,
        images: mergedImages,
      },
      { new: true }
    ).populate("category", "id name color");

    await updateStockAlerts(updated);

    return res.status(200).json(updated);
  } catch (error) {
    console.error('[PUT /products/:id] Error:', error.message, error.stack);
    return res.status(500).json({ message: "Failed to update product", error: error.message });
  }
});

// DELETE /products/:id — admin only
router.delete("/:id", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to delete product" });
  }
});

module.exports = router;
