const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authJwt = require("../middleware/authJwt");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const StockAlert = require("../models/StockAlert");
const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");
const { sanitizeProfanity } = require("../services/profanityFilter");
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
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});

const uploadReviewImages = upload.array("images", 3);

const STOCK_LOW_THRESHOLD = 10;

async function notifyAdmins(title, body) {
  try {
    const admins = await User.find({ isAdmin: true, pushToken: { $ne: "" } }, "pushToken pushTokenType").lean();
    const tokens = admins
      .filter((a) => a.pushToken)
      .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
    console.log(`[notifyAdmins] Sending to ${tokens.length} admin(s): "${title}"`);
    await sendToTokens(tokens, { title, body });
  } catch (error) {
    console.error('[notifyAdmins] Error:', error.message);
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
      await notifyAdmins("Low stock", `${productName} is low on stock (${count}).`);
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
  return `${req.protocol}://${req.get("host")}/${config.uploadDir}/${filename}`;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
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

// GET /products — public, used by home screen
router.get("/", async (_req, res) => {
  try {
    const products = await Product.find().populate("category", "id name color");
    return res.status(200).json(products);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load products" });
  }
});

// GET /products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "id name color");
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.status(200).json(product);
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

    const deliveredOrder = await Order.findOne({
      _id: orderId,
      user: req.user.userId,
      status: "delivered",
      "orderItems.product": productId,
    }).lean();

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

    const images = (req.files || []).map((file) => buildImageUrl(req, file.filename)).slice(0, 3);

    const review = await Review.create({
      product: productId,
      order: orderId,
      user: req.user.userId,
      rating,
      comment,
      images,
    });

    await refreshProductReviewStats(productId);

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
router.put("/:id/reviews/:reviewId", authJwt, uploadReviewImages, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    const reviewId = toObjectIdOrNull(req.params.reviewId);
    if (!productId || !reviewId) return res.status(400).json({ message: "Invalid id" });

    const review = await Review.findOne({ _id: reviewId, product: productId });
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You can edit only your own review" });
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

    const uploadedImages = (req.files || []).map((file) => buildImageUrl(req, file.filename)).slice(0, 3);
    review.images = [...retainedImages, ...uploadedImages].slice(0, 3);

    await review.save();
    await refreshProductReviewStats(productId);

    const populated = await review.populate("user", "id name image");
    return res.status(200).json(populated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update review" });
  }
});

// POST /products — admin only, multipart
router.post("/", authJwt, upload.single("image"), async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured } = req.body;
    if (!name || !brand || !price || !category || countInStock === undefined) {
      return res.status(400).json({ message: "name, brand, price, category and countInStock are required" });
    }
    const image = req.file ? buildImageUrl(req, req.file.filename) : "";
    const product = await Product.create({
      name, brand, price: Number(price), description, richDescription,
      category, countInStock: Number(countInStock),
      rating: Number(rating || 0), numReviews: Number(numReviews || 0),
      isFeatured: isFeatured === "true" || isFeatured === true,
      image,
    });
    const populated = await product.populate("category", "id name color");
    await updateStockAlerts(product);
    return res.status(201).json(populated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to create product" });
  }
});

// PUT /products/:id — admin only, multipart
router.put("/:id", authJwt, upload.single("image"), async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured } = req.body;
    const image = req.file ? buildImageUrl(req, req.file.filename) : existing.image;

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
        image,
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
