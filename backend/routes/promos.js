const express = require("express");
const authJwt = require("../middleware/authJwt");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendToTokens } = require("../services/notifications");
const Product = require("../models/Product");

const router = express.Router();

async function getLatestPushTokensForUsers(userIds = []) {
  const ids = (userIds || []).filter(Boolean);
  if (ids.length === 0) return [];

  const users = await User.find(
    {
      _id: { $in: ids },
      pushToken: { $exists: true, $ne: null, $ne: "" },
    },
    "pushToken pushTokenType"
  ).lean();

  return users
    .map((u) => {
      const token = String(u?.pushToken || "").trim();
      if (!token) return null;
      return { token, type: u?.pushTokenType || "fcm" };
    })
    .filter(Boolean);
}

// GET /promos — public endpoint to fetch active promos grouped by discount
router.get("/", async (req, res) => {
  try {
    // Return limited promo info based on products with active originalPrice set
    // Any product currently sold below stored original price counts as an active promo
    // (ignore promoExpireAt so admins/users still see reality if expiry wasn't set or clock skewed)
    const productsWithDiscounts = await Product.find(
      {
        originalPrice: { $exists: true, $ne: null, $gt: 0 },
        $expr: { $lt: ["$price", "$originalPrice"] },
      },
      "id name originalPrice price category promoExpireAt"
    ).lean();

    // Group by discount percentage
    const promos = {};
    productsWithDiscounts.forEach((p) => {
      const orig = Number(p.originalPrice || p.price);
      const curr = Number(p.price);
      if (orig > curr && orig > 0) {
        const discountPct = Math.round(((orig - curr) / orig) * 100);
        if (!promos[discountPct]) {
          promos[discountPct] = { 
            discountPercent: discountPct, 
            productCount: 0,
            expireAt: null
          };
        }
        promos[discountPct].productCount++;
        // Use earliest expiry time
        if (!promos[discountPct].expireAt || new Date(p.promoExpireAt) < new Date(promos[discountPct].expireAt)) {
          promos[discountPct].expireAt = p.promoExpireAt;
        }
      }
    });

    return res.status(200).json(Object.values(promos));
  } catch (_error) {
    return res.status(500).json({ message: "Failed to fetch promos" });
  }
});

// GET /promos/admin/active — admin endpoint to see all active promos by category
router.get("/admin/active", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all products with active promos grouped by category
    const productsWithPromos = await Product.find(
      {
        originalPrice: { $exists: true, $ne: null, $gt: 0 },
        $expr: { $lt: ["$price", "$originalPrice"] },
      },
      "id name originalPrice price category promoExpireAt"
    ).populate("category", "name").lean();

    console.log(`[promos.admin.active] Found ${productsWithPromos.length} products with active promos`);

    if (productsWithPromos.length === 0) {
      console.log("[promos.admin.active] No products found with active promos. Checking database state...");
      const allProducts = await Product.countDocuments();
      const promoProducts = await Product.countDocuments({ originalPrice: { $exists: true, $ne: null } });
      const expiredPromos = await Product.countDocuments({ 
        originalPrice: { $exists: true, $ne: null },
        promoExpireAt: { $lt: new Date() }
      });
      const futurePromos = await Product.countDocuments({ 
        originalPrice: { $exists: true, $ne: null },
        promoExpireAt: { $gte: new Date() }
      });
      console.log(`Database state: ${allProducts} total products, ${promoProducts} with originalPrice, ${expiredPromos} expired, ${futurePromos} active`);
    }

    // Group by category
    const promosByCategory = {};
    productsWithPromos.forEach((p) => {
      const catId = p.category?.id || p.category?._id || "uncategorized";
      const catName = p.category?.name || "Uncategorized";
      
      if (!promosByCategory[catId]) {
        promosByCategory[catId] = {
          categoryId: catId,
          categoryName: catName,
          products: [],
          minExpireAt: null,
          discountSample: 0,
        };
      }

      const orig = Number(p.originalPrice);
      const curr = Number(p.price);
      const discountPct = Math.round(((orig - curr) / orig) * 100);

      promosByCategory[catId].products.push({
        id: p.id || p._id,
        name: p.name,
        discount: discountPct,
      });

      promosByCategory[catId].discountSample = discountPct;

      // Track earliest expiry
      if (!promosByCategory[catId].minExpireAt || new Date(p.promoExpireAt) < new Date(promosByCategory[catId].minExpireAt)) {
        promosByCategory[catId].minExpireAt = p.promoExpireAt;
      }
    });

    const result = Object.values(promosByCategory);
    console.log(`[promos.admin.active] Returning ${result.length} category groups`);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[promos.admin.active]", error.message);
    return res.status(500).json({ message: "Failed to fetch active promos" });
  }
});

// POST /promos/broadcast — admin-only promo push broadcast
router.post("/broadcast", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();
    const discountPercentRaw = req.body?.discountPercent;
    const categoryId = req.body?.categoryId;
    const durationDaysRaw = req.body?.durationDays;
    const durationHoursRaw = req.body?.durationHours;
    const includeSender = req.body?.includeSender === true || String(req.body?.includeSender).toLowerCase() === "true";

    // Parse duration: convert days + hours to total hours
    // Default: 1 day (24 hours)
    const days = Number.isFinite(durationDaysRaw) && durationDaysRaw > 0 ? Number(durationDaysRaw) : 0;
    const hours = Number.isFinite(durationHoursRaw) && durationHoursRaw > 0 ? Number(durationHoursRaw) : 0;
    const totalDurationHours = days > 0 || hours > 0 ? (days * 24 + hours) : 24;
    const promoExpireAt = new Date(Date.now() + totalDurationHours * 60 * 60 * 1000);

    const discountPercent = discountPercentRaw === undefined || discountPercentRaw === null || discountPercentRaw === ""
      ? null
      : Number(discountPercentRaw);

    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }

    // Optional: apply promo discount to products before sending notifications.
    // If discountPercent is missing/invalid, we only broadcast notifications.
    const shouldApplyPromo = Number.isFinite(discountPercent) && discountPercent > 0 && discountPercent <= 90;
    let appliedCount = 0;

    if (shouldApplyPromo) {
      const targetQuery = categoryId && String(categoryId).toLowerCase() !== "all"
        ? { category: categoryId }
        : {};

      console.log(`[promos.broadcast] Applying ${discountPercent}% discount with query:`, targetQuery);

      const factor = 1 - discountPercent / 100;
      const products = await Product.find(targetQuery).lean();
      appliedCount = products.length;
      console.log(`[promos.broadcast] Found ${appliedCount} products to update. promoExpireAt will be set to: ${promoExpireAt.toISOString()}`);

      // Apply updates one-by-one so we can preserve originalPrice.
      for (const p of products) {
        const original = Number(p.originalPrice);
        const basePrice = Number.isFinite(original) && original > 0 ? original : Number(p.price);
        if (!Number.isFinite(basePrice)) {
          console.log(`[promos.broadcast] Skipping product ${p._id} - invalid price`);
          continue;
        }

        const nextPrice = Math.round(basePrice * factor * 100) / 100;
        
        const updateResult = await Product.findByIdAndUpdate(p._id, {
          originalPrice: (p.originalPrice === null || p.originalPrice === undefined) ? basePrice : (Number.isFinite(p.originalPrice) ? p.originalPrice : basePrice),
          price: nextPrice,
          promoExpireAt: promoExpireAt,
        });
        
        if (!updateResult) {
          console.log(`[promos.broadcast] Failed to update product ${p._id}`);
        }
      }
      console.log(`[promos.broadcast] Finished updating ${appliedCount} products with ${discountPercent}% discount`);
    } else {
      console.log(`[promos.broadcast] Not applying promo: shouldApplyPromo=${shouldApplyPromo}, discountPercent=${discountPercent}`);
    }

    // Step 1a: Get ALL non-admin users to save notifications to database
    // Users without push tokens will still see promos in NotificationCenter when they open app
    const allCustomers = await User.find({ isAdmin: false }).select("_id").lean();
    console.log(`[promos.broadcast] Found ${allCustomers.length} total non-admin users`);

    // Step 1b: Resolve latest push tokens from user IDs at send time.
    // This avoids missing sends when token fields on older snapshots are stale.
    const customerIds = allCustomers.map((u) => u._id);
    const tokens = await getLatestPushTokensForUsers(customerIds);

    // Optional: include sender's own device token (useful when admin tests broadcast on same phone).
    if (includeSender) {
      const sender = await User.findById(req.user.userId).select("_id pushToken pushTokenType").lean();
      if (sender?.pushToken && sender.pushToken.trim() !== "") {
        const senderType = sender.pushTokenType || "fcm";
        const exists = tokens.some((t) => t.token === sender.pushToken);
        if (!exists) {
          tokens.push({ token: sender.pushToken, type: senderType });
        }

        const alreadyInDbTargets = allCustomers.some((u) => String(u._id) === String(sender._id));
        if (!alreadyInDbTargets) {
          allCustomers.push({ _id: sender._id });
        }
      }
    }

    console.log(`[promos.broadcast] Recipients with push tokens: ${tokens.length} tokens from ${allCustomers.length} users`);

    // Step 2: Save promo notification to database for ALL non-admin users
    // This ensures even users without push tokens see it in NotificationCenter
    if (allCustomers.length > 0) {
      const notificationRecords = allCustomers.map((user) => ({
        user: user._id,
        type: "promo",
        title: title,
        message: message,
        data: {
          promoTitle: title,
          promoDiscountPercent: shouldApplyPromo ? discountPercent : null,
          promoCategoryId: categoryId || null,
          promoAppliedCount: shouldApplyPromo ? appliedCount : 0,
          promoExpireAt: promoExpireAt.toISOString(),
          promoDurationHours: totalDurationHours,
        },
      }));
      await Notification.insertMany(notificationRecords);
      console.log(`[promos.broadcast] Saved promo notifications to database for ${allCustomers.length} users`);
    }

    // Step 3: Send push notifications (only to users with tokens)
    if (tokens.length > 0) {
      console.log(`[promos.broadcast] Sending push notifications to ${tokens.length} recipients...`);
      await sendToTokens(tokens, {
        title,
        body: message,
        data: {
          route: "notifications",
          type: "promo",
          promoTitle: title,
          promoDiscountPercent: shouldApplyPromo ? discountPercent : null,
          promoCategoryId: categoryId || null,
          promoAppliedCount: shouldApplyPromo ? appliedCount : 0,
          promoExpireAt: promoExpireAt.toISOString(),
          promoDurationHours: String(totalDurationHours),
        },
      });
      console.log(`[promos.broadcast] Push notifications sent successfully`);
    } else {
      console.log("[promos.broadcast] No push tokens available, but notifications saved to database");
    }

    return res.status(200).json({ 
      success: true, 
      saved: allCustomers.length,
      sent: tokens.length, 
      appliedCount,
      message: `Saved to ${allCustomers.length} users, pushed to ${tokens.length} devices`
    });
  } catch (_error) {
    console.error("[promos.broadcast] Error:", _error.message);
    return res.status(500).json({ message: "Failed to broadcast promo notification" });
  }
});

// DELETE /promos/:categoryId — admin-only endpoint to cancel/end a promo early
router.delete("/:categoryId", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const categoryId = req.params.categoryId;
    const targetQuery = categoryId && String(categoryId).toLowerCase() !== "all"
      ? { category: categoryId }
      : {};

    console.log(`[promos.cancel] Canceling promo for category: ${categoryId || "all"}`);

    // Find products with active promos in this category
    const productsWithPromo = await Product.find({
      ...targetQuery,
      originalPrice: { $exists: true, $ne: null, $gt: 0 },
      $expr: { $lt: ["$price", "$originalPrice"] },
    }).lean();

    console.log(`[promos.cancel] Found ${productsWithPromo.length} products with active promos`);

    // Revert prices back to original and clear promo expiry
    let revertedCount = 0;
    for (const product of productsWithPromo) {
      if (Number.isFinite(product.originalPrice) && product.originalPrice > 0) {
        await Product.findByIdAndUpdate(product._id, {
          price: product.originalPrice,
          originalPrice: null,
          promoExpireAt: null,
        });
        revertedCount++;
      }
    }

    console.log(`[promos.cancel] Reverted ${revertedCount} products to original prices`);

    return res.status(200).json({ 
      success: true, 
      message: `Promo canceled for ${categoryId || "all categories"}`,
      revertedCount 
    });
  } catch (error) {
    console.error("[promos.cancel] Error:", error.message);
    return res.status(500).json({ message: "Failed to cancel promo" });
  }
});

// Debug endpoint (remove in production)
router.get("/debug/check-promos", async (req, res) => {
  try {
    const now = new Date();
    const productsWithPromos = await Product.find({
      originalPrice: { $exists: true, $ne: null, $gt: 0 },
      $expr: { $lt: ["$price", "$originalPrice"] },
    }).select("name price originalPrice promoExpireAt category").populate("category", "name").lean();

    const staleOriginalOnly = await Product.find({
      originalPrice: { $exists: true, $ne: null, $gt: 0 },
      $expr: { $gte: ["$price", "$originalPrice"] },
    }).select("name price originalPrice promoExpireAt").lean();

    const allProducts = await Product.countDocuments();
    const withOriginalPrice = await Product.countDocuments({ originalPrice: { $exists: true, $ne: null } });

    return res.status(200).json({
      totalProducts: allProducts,
      productsWithOriginalPrice: withOriginalPrice,
      activeDiscountRows: productsWithPromos.length,
      originalPriceButNotDiscounted: staleOriginalOnly.length,
      activePromosList: productsWithPromos,
      staleOriginalList: staleOriginalOnly,
      currentTime: now.toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /promos/test/send-notification — admin test endpoint to send a test notification
router.post("/test/send-notification", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const {
      title = "Test Notification",
      message = "This is a test push notification",
      userId,
      includeSender = true,
    } = req.body;

    console.log(`[promos.test] Sending test notification. userId=${userId || "all"}`);

    if (userId) {
      // Send to specific user
      console.log(`[promos.test] Looking up user ${userId}...`);
      const user = await User.findById(userId).select("name email pushToken pushTokenType").lean();
      if (!user) {
        console.log(`[promos.test] User not found: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      const directTokens = await getLatestPushTokensForUsers([user._id]);

      if (directTokens.length === 0) {
        console.log(`[promos.test] User ${user.name} (${user.email}) has no push token registered`);
        return res.status(400).json({ 
          message: "User has no push token registered",
          user: { name: user.name, email: user.email }
        });
      }

      console.log(`[promos.test] User ${user.name} has ${directTokens[0].type} token: ${directTokens[0].token.substring(0, 40)}...`);
      
      console.log(`[promos.test] Sending to 1 device...`);
      await sendToTokens(directTokens, {
        title,
        body: message,
        data: {
          route: "notifications",
          type: "test",
          isTest: "true",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Test notification sent to user",
        sent: 1,
        userId,
        userInfo: { name: user.name, email: user.email, tokenType: directTokens[0].type },
      });
    } else {
      // Send to all non-admin users with tokens
      console.log(`[promos.test] Fetching all non-admin users with push tokens...`);
      
      const totalUsers = await User.countDocuments({ isAdmin: false });
      console.log(`[promos.test] Total non-admin users: ${totalUsers}`);
      
      const recipients = await User.find(
        { isAdmin: false },
        "_id name email"
      ).lean();

      const tokens = await getLatestPushTokensForUsers(recipients.map((u) => u._id));
      console.log(`[promos.test] Users with push tokens: ${tokens.length}`);

      // Optionally include the requesting admin's own device for easier end-to-end testing.
      let senderIncluded = false;
      const includeSenderBool = includeSender === true || String(includeSender).toLowerCase() === "true";
      if (includeSenderBool) {
        const sender = await User.findById(req.user.userId)
          .select("name email pushToken pushTokenType")
          .lean();

        if (sender?.pushToken && sender.pushToken.trim()) {
          const exists = tokens.some((t) => t.token === sender.pushToken);
          if (!exists) {
            tokens.push({ token: sender.pushToken, type: sender.pushTokenType || "fcm" });
          }
          senderIncluded = true;
          console.log(`[promos.test] Included sender token for ${sender.email}`);
        } else {
          console.log("[promos.test] includeSender requested, but sender has no push token");
        }
      }

      if (tokens.length === 0) {
        console.log(`[promos.test] No users with push tokens found! Total users: ${totalUsers}`);
        return res.status(200).json({
          success: true,
          message: "No users with push tokens found",
          sent: 0,
          totalUsers,
          note: "Users need to log in and grant notification permissions to receive push notifications",
        });
      }

      console.log(`[promos.test] Sending to ${tokens.length} token(s)...`);
      await sendToTokens(tokens, {
        title,
        body: message,
        data: {
          route: "notifications",
          type: "test",
          isTest: "true",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Test notification sent to all users",
        sent: tokens.length,
        recipientCount: recipients.length,
        senderIncluded,
        breakdown: {
          expo: tokens.filter(t => t.type === 'expo').length,
          fcm: tokens.filter(t => t.type === 'fcm').length,
        }
      });
    }
  } catch (error) {
    console.error("[promos.test]", error.message, error.stack);
    return res.status(500).json({ message: "Failed to send test notification", error: error.message });
  }
});

module.exports = router;
