const express = require("express");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Order = require("../models/Order");
const Review = require("../models/Review");
const User = require("../models/User");
const Product = require("../models/Product");
const StockAlert = require("../models/StockAlert");
const Notification = require("../models/Notification");
const { sendToTokens } = require("../services/notifications");

const router = express.Router();

// Helper function to notify admins
async function notifyAdmins(title, body, data = {}) {
  try {
    const admins = await User.find(
      { isAdmin: true, pushToken: { $ne: "" } },
      "pushToken pushTokenType"
    ).lean();
    
    if (!admins.length) {
      console.log("[notifyAdmins] No admins with push tokens found");
      return;
    }

    const tokens = admins
      .filter((a) => a.pushToken && a.pushToken.trim() !== "")
      .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));

    console.log(`[notifyAdmins] Sending to ${tokens.length} admin(s): "${title}"`);
    await sendToTokens(tokens, { title, body, data });
  } catch (error) {
    console.error("[notifyAdmins] Error:", error.message);
  }
}

// Helper function to notify user about order status and save to database (no email)
async function notifyUserOrderStatus(userId, orderId, status, additionalData = {}) {
  try {
    if (!userId || !orderId) return;

    // Create notification in database
    const statusLabel = {
      pending: "Order Confirmed",
      shipped: "Order Shipped",
      delivered: "Order Delivered",
      cancelled: "Order Cancelled",
    }[status] || "Order Updated";

    const statusMessage = {
      pending: "Your order has been confirmed and is being prepared.",
      shipped: "Your order is on its way!",
      delivered: "Your order has been delivered. Thank you!",
      cancelled: "Your order has been cancelled.",
    }[status] || `Your order status is now: ${status}`;

    // Save to database
    await Notification.create({
      user: userId,
      type: "order_status",
      title: statusLabel,
      message: statusMessage,
      orderId: orderId,
      orderStatus: status,
      data: additionalData,
    });

    console.log(`[notifyUserOrderStatus] Notification saved for user ${userId}, order ${orderId}, status ${status}`);
  } catch (error) {
    console.error("[notifyUserOrderStatus] Error:", error.message);
  }
}

async function getUserPushTokens(userRef) {
  const userId =
    (typeof userRef === "object" && (userRef?._id || userRef?.id)) ||
    userRef;

  if (!userId) return [];

  const user = await User.findById(userId)
    .select("pushToken pushTokenType")
    .lean();

  const token = String(user?.pushToken || "").trim();
  if (!token) return [];

  return [{ token, type: user?.pushTokenType || "fcm" }];
}

const STATUS = {
  PENDING: "pending",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

function normalizeStatus(value) {
  if (!value) return "";
  const lowered = String(value).toLowerCase();
  if (lowered === "3") return STATUS.PENDING;
  if (lowered === "2") return STATUS.SHIPPED;
  if (lowered === "1") return STATUS.DELIVERED;
  return lowered;
}

async function attachReviewFlagsForUserOrders(userId, orders) {
  if (!Array.isArray(orders) || orders.length === 0) return orders;

  const orderIds = orders.map((order) => order._id).filter(Boolean);
  const existingReviews = await Review.find(
    { user: userId, order: { $in: orderIds } },
    "order product"
  ).lean();

  const reviewSet = new Set(
    existingReviews.map((review) => `${review.order.toString()}:${review.product.toString()}`)
  );

  return orders.map((order) => {
    const delivered = normalizeStatus(order.status) === STATUS.DELIVERED;
    const orderId = order._id?.toString();
    const enrichedItems = (order.orderItems || []).map((item) => {
      const productId = item.product?.toString?.() || item.product;
      const key = `${orderId}:${productId}`;
      const hasUserReview = reviewSet.has(key);
      return {
        ...item,
        hasUserReview,
        canLeaveReview: delivered && !hasUserReview,
      };
    });

    return {
      ...order,
      orderItems: enrichedItems,
    };
  });
}

// POST /orders — authenticated user places an order
router.post("/", authJwt, async (req, res) => {
  try {
    const { orderItems } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    const userProfile = await User.findById(req.user.userId).lean();
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const shippingAddress1 = String(userProfile.deliveryAddress1 || "").trim();
    const shippingAddress2 = String(userProfile.deliveryAddress2 || "").trim();
    const city = String(userProfile.deliveryCity || "").trim();
    const zip = String(userProfile.deliveryZip || "").trim();
    const country = String(userProfile.deliveryCountry || "").trim();
    const phone = String(userProfile.phone || "").trim();

    if (!phone || !shippingAddress1 || !city || !zip || !country) {
      return res.status(400).json({
        message: "Complete your profile delivery details first (phone, address, city, zip, country)",
      });
    }

    // Map each cart item to the embedded orderItem shape.
    // Cart items from Redux store have the full product object spread with a quantity field.
    // product id may come as item.id, item._id, or item.product
    const mappedItems = orderItems.map((item) => {
      const productId =
        item.product ||
        item.id ||
        (typeof item._id === "string" ? item._id : item._id?.toString());

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error(`Invalid product reference: ${JSON.stringify(productId)}`);
      }

      return {
        product: productId,
        name: item.name || "",
        price: Number(item.price) || 0,
        image: item.image || "",
        quantity: Number(item.quantity) || 1,
      };
    });

    // Calculate total price server-side to prevent tampering
    const totalPrice = mappedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      orderItems: mappedItems,
      shippingAddress1,
      shippingAddress2,
      city,
      zip,
      country,
      phone,
      status: STATUS.PENDING,
      totalPrice,
      user: req.user.userId,
      dateOrdered: new Date(),
    });

    // Decrement product stock and check for stock alerts
    for (const item of mappedItems) {
      try {
        const product = await Product.findById(item.product);
        if (product) {
          const previousStock = product.countInStock;
          product.countInStock = Math.max(0, product.countInStock - item.quantity);
          await product.save();
          
          console.log(`[Stock Update] Product: ${product.name}, Previous: ${previousStock}, New: ${product.countInStock}`);

          // Check if stock is now at or below threshold (10 items)
          if (product.countInStock <= 10 && product.countInStock > 0) {
            // Check if alert already exists for this product
            const existingAlert = await StockAlert.findOne({
              product: product._id,
              resolved: false,
              type: "low",
            });

            if (!existingAlert) {
              // Create stock alert
              await StockAlert.create({
                product: product._id,
                stockLevel: product.countInStock,
                threshold: 10,
                type: "low",
                resolved: false,
              });
              
              console.log(`[Stock Alert] Low stock alert created for ${product.name} (stock: ${product.countInStock})`);
            }
          } else if (product.countInStock === 0 && previousStock > 0) {
            // Create alert for out of stock
            const existingAlert = await StockAlert.findOne({
              product: product._id,
              resolved: false,
              type: "out_of_stock",
            });

            if (!existingAlert) {
              await StockAlert.create({
                product: product._id,
                stockLevel: 0,
                threshold: 10,
                type: "out_of_stock",
                resolved: false,
              });
              
              console.log(`[Stock Alert] Out of stock alert created for ${product.name}`);
            }
          }
        }
      } catch (err) {
        console.error(`[orders] Error updating stock for product ${item.product}:`, err.message);
      }
    }

    // Notify admins about stock alerts
    try {
      const admins = await User.find({ isAdmin: true }, "pushToken pushTokenType").lean();
      console.log(`[Stock Notification] Found ${admins.length} admins`);
      
      const adminTokens = admins
        .filter((a) => a.pushToken && a.pushToken.trim() !== "")
        .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
      
      console.log(`[Stock Notification] Admin tokens with push: ${adminTokens.length}`);
      
      if (adminTokens.length > 0) {
        // Get all unresolved stock alerts
        const alerts = await StockAlert.find({ resolved: false })
          .populate("product", "name countInStock")
          .sort({ createdAt: -1 })
          .limit(10);
        
        if (alerts.length > 0) {
          // Batch all alerts into ONE notification per admin
          const alertSummaryLines = alerts.map((alert) => {
            const product = alert.product;
            return alert.type === "out_of_stock"
              ? `🚨 ${product.name} - OUT OF STOCK`
              : `⚠️ ${product.name} - ${product.countInStock} items left`;
          });

          const alertSummary = alertSummaryLines.join("\n");
          const alertCount = alerts.length;

          console.log(`[Stock Notification] Batching ${alertCount} alerts into single notification`);
          
          await sendToTokens(adminTokens, {
            title: `Stock Alerts (${alertCount})`,
            body: alertSummary,
            data: { 
              route: "stock-alerts",
              alertCount: String(alertCount),
              type: "stock_alert_batch"
            },
          });
        }
      }
    } catch (err) {
      console.error(`[orders] Error sending stock notifications:`, err.message);
    }

    // Notify admins about new order
    const admins = await User.find({ isAdmin: true, pushToken: { $ne: "" } }, "pushToken pushTokenType").lean();
    const adminTokens = admins
      .filter((a) => a.pushToken)
      .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
    await sendToTokens(adminTokens, {
      title: "New order placed",
      body: `Order #${order.id} for $${totalPrice} has been placed.`,
      data: { orderId: order.id, route: "admin-orders" },
    });

    // Notify the customer about order confirmation
    // ALWAYS save notification to database (so it appears on notification page)
    // THEN send push (to all users if broadcast mode enabled, or just this user if they have a token)
    await Notification.create({
      user: req.user.userId,
      type: "order_status",
      title: "Order Confirmation",
      message: `Your order #${order.id} for $${totalPrice} has been confirmed! We'll update you soon.`,
      orderId: order._id,
      orderStatus: "pending",
      data: { orderId: order.id },
    });

    // Send push notification - respects PUSH_NOTIFY_ALL_USERS flag.
    // If user has no token yet, pass [] so broadcast mode can still deliver to all users.
    const customer = await User.findById(req.user.userId).lean();
    const customerTokens = customer?.pushToken
      ? [{ token: customer.pushToken, type: customer.pushTokenType || "fcm" }]
      : [];

    await sendToTokens(customerTokens, {
      title: "Order Confirmation",
      body: `Your order #${order.id} for $${totalPrice} has been confirmed! We'll update you soon.`,
      data: { orderId: order.id, status: "pending", route: "order-details" },
    });

    if (!customer?.pushToken) {
      console.log(`[orders] User ${req.user.userId} has no push token registered yet (broadcast mode may still deliver).`);
    }

    return res.status(201).json(order);
  } catch (error) {
    console.error("[orders] POST error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to create order" });
  }
});

// GET /orders — admin sees all, user sees own orders (newest first)
router.get("/", authJwt, async (req, res) => {
  try {
    const filter = req.user?.isAdmin ? {} : { user: req.user.userId };
    const orderDocs = await Order.find(filter)
      .populate("user", "id name email")
      .sort({ dateOrdered: -1 });

    let orders = orderDocs.map((order) => order.toObject());
    if (!req.user?.isAdmin) {
      orders = await attachReviewFlagsForUserOrders(req.user.userId, orders);
    }

    return res.status(200).json(orders);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

// GET /orders/:id — auth required (admin or order owner)
router.get("/:id", authJwt, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "id name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = order.user?._id?.toString() === req.user.userId;
    if (!req.user.isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let orderPayload = order.toObject();
    if (!req.user?.isAdmin) {
      const [enriched] = await attachReviewFlagsForUserOrders(req.user.userId, [orderPayload]);
      orderPayload = enriched;
    }

    return res.status(200).json(orderPayload);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load order" });
  }
});

// PUT /orders/:id — admin or owner updates status with rules
router.put("/:id", authJwt, async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const existing = await Order.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const isOwner = existing.user?.toString() === req.user.userId;
    if (!req.user?.isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const currentStatus = normalizeStatus(existing.status);
    const desiredStatus = normalizeStatus(status);

    if (![STATUS.PENDING, STATUS.SHIPPED, STATUS.DELIVERED, STATUS.CANCELLED].includes(desiredStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if ([STATUS.CANCELLED, STATUS.DELIVERED].includes(currentStatus)) {
      return res.status(409).json({ message: "Finalized orders cannot be updated" });
    }

    if (desiredStatus === currentStatus) {
      const unchanged = await existing.populate("user", "id name email");
      return res.status(200).json(unchanged);
    }

    const adminTransitions = {
      [STATUS.PENDING]: [STATUS.SHIPPED, STATUS.CANCELLED],
      [STATUS.SHIPPED]: [STATUS.DELIVERED, STATUS.CANCELLED],
      [STATUS.DELIVERED]: [],
      [STATUS.CANCELLED]: [],
    };

    const userTransitions = {
      [STATUS.PENDING]: [STATUS.CANCELLED],
      [STATUS.SHIPPED]: [STATUS.CANCELLED],
      [STATUS.DELIVERED]: [],
      [STATUS.CANCELLED]: [],
    };

    const allowed = req.user?.isAdmin
      ? adminTransitions[currentStatus] || []
      : userTransitions[currentStatus] || [];

    if (!allowed.includes(desiredStatus)) {
      return res.status(403).json({ message: "Status change not allowed" });
    }

    // Prepare update payload
    const updatePayload = {
      statusUpdatedAt: new Date(),
    };

    // Handle user cancellation request for SHIPPED orders
    if (!req.user?.isAdmin && desiredStatus === STATUS.CANCELLED && currentStatus === STATUS.SHIPPED) {
      // User requests cancellation of a shipped order - requires admin approval
      if (!cancellationReason) {
        return res.status(400).json({ message: "Cancellation reason is required for shipped orders" });
      }
      updatePayload.cancellationApprovalStatus = "pending_approval";
      updatePayload.cancellationReason = String(cancellationReason).trim();
      // Don't change the status yet, keep it as "shipped" until admin approves
    } else {
      // Admin cancellation or user cancellation of pending order - immediate
      updatePayload.status = desiredStatus;
      if (desiredStatus === STATUS.CANCELLED && cancellationReason) {
        updatePayload.cancellationReason = String(cancellationReason).trim();
      }
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    ).populate("user", "id name email pushToken pushTokenType");

    // Notify the customer about status change
    const recipient = updated.user;
    const recipientId = recipient?.id || recipient?._id;
    const recipientTokens = await getUserPushTokens(recipientId);
    const actualStatus = normalizeStatus(updated.status);
    const statusActuallyChanged = actualStatus !== currentStatus;

    // Cancellation request for shipped orders: status is still shipped, but user should be informed.
    if (updatePayload.cancellationApprovalStatus === "pending_approval") {
      const requestTitle = "Cancellation Request Received";
      const requestBody = `Your cancellation request for Order #${updated.id || updated._id} is pending admin approval.`;

      await sendToTokens(recipientTokens, {
        title: requestTitle,
        body: requestBody,
        data: {
          type: "order_status",
          orderId: updated.id || updated._id,
          status: actualStatus,
          route: "order-details",
          cancellationApprovalStatus: "pending_approval",
          reason: updatePayload.cancellationReason || null,
        },
      });

      await Notification.create({
        user: recipientId,
        type: "order_status",
        title: requestTitle,
        message: requestBody,
        orderId: updated.id || updated._id,
        orderStatus: actualStatus,
        data: {
          cancellationApprovalStatus: "pending_approval",
          reason: updatePayload.cancellationReason || null,
        },
      });
    }

    // Actual status transitions: pending -> shipped -> delivered or cancelled.
    if (statusActuallyChanged) {
      let notificationTitle = "Order Updated";
      let notificationBody = `Order #${updated.id || updated._id} status is now ${actualStatus}.`;

      if (actualStatus === STATUS.SHIPPED) {
        notificationTitle = "Order Shipped";
        notificationBody = `Order #${updated.id || updated._id} has been shipped! Track your delivery.`;
      } else if (actualStatus === STATUS.DELIVERED) {
        notificationTitle = "Order Delivered";
        notificationBody = `Order #${updated.id || updated._id} has been delivered! Thank you for your purchase.`;
      } else if (actualStatus === STATUS.CANCELLED) {
        notificationTitle = "Order Cancelled";
        notificationBody = updatePayload.cancellationReason
          ? `Order #${updated.id || updated._id} has been cancelled. Reason: ${updatePayload.cancellationReason}`
          : `Order #${updated.id || updated._id} has been cancelled.`;
      }

      await sendToTokens(recipientTokens, {
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: "order_status",
          orderId: updated.id || updated._id,
          status: actualStatus,
          route: "order-details",
          reason: updatePayload.cancellationReason || null,
        },
      });

      // Persist status notification regardless of push token availability.
      await notifyUserOrderStatus(
        recipientId,
        updated.id || updated._id,
        actualStatus,
        { reason: updatePayload.cancellationReason || null }
      );
    }

    // Notify admins about cancellations and cancellation requests
    if (desiredStatus === STATUS.CANCELLED || updatePayload.cancellationApprovalStatus === "pending_approval") {
      const adminNotifData = {
        orderId: updated.id || updated._id,
        userId: recipientId,
        route: "admin-orders",
      };

      if (updatePayload.cancellationApprovalStatus === "pending_approval") {
        // User requested cancellation of shipped order
        await notifyAdmins(
          "🚨 Cancellation Request",
          `User requested cancellation of Order #${updated.id || updated._id} (${updated.user?.name || "Customer"}). Reason: ${updatePayload.cancellationReason}`,
          adminNotifData
        );
      } else if (desiredStatus === STATUS.CANCELLED && !req.user?.isAdmin) {
        // User cancelled pending order
        await notifyAdmins(
          "❌ Order Cancelled",
          `User cancelled Order #${updated.id || updated._id} (${updated.user?.name || "Customer"}). Reason: ${updatePayload.cancellationReason || "No reason provided"}`,
          adminNotifData
        );
      }
    }

    return res.status(200).json(updated);
  } catch (_error) {
    console.error("[orders] PUT error:", _error.message);
    return res.status(500).json({ message: "Failed to update order" });
  }
});

// PUT /orders/:id/approve-cancellation — admin approves or rejects user's cancellation request
router.put("/:id/approve-cancellation", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can approve cancellations" });
    }

    const { approve } = req.body;

    if (approve === undefined) {
      return res.status(400).json({ message: "Approve parameter is required (true/false)" });
    }

    const existing = await Order.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Order not found" });

    if (existing.cancellationApprovalStatus !== "pending_approval") {
      return res.status(409).json({ message: "No pending cancellation request for this order" });
    }

    const updatePayload = {
      statusUpdatedAt: new Date(),
    };

    if (approve === true) {
      updatePayload.status = STATUS.CANCELLED;
      updatePayload.cancellationApprovalStatus = "approved";
    } else {
      updatePayload.cancellationApprovalStatus = "none";
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    ).populate("user", "id name email pushToken pushTokenType");

    // Notify the customer about approval/rejection
    const recipient = updated.user;
    const recipientId = recipient?.id || recipient?._id;
    const recipientTokens = await getUserPushTokens(recipientId);
    const notificationTitle = approve ? "Cancellation Approved" : "Cancellation Rejected";
    const notificationBody = approve
      ? `Your cancellation request for Order #${updated.id || updated._id} has been approved.`
      : `Your cancellation request for Order #${updated.id || updated._id} has been rejected.`;

    await sendToTokens(recipientTokens, {
      title: notificationTitle,
      body: notificationBody,
      data: {
        type: "order_status",
        orderId: updated.id || updated._id,
        status: updated.status,
        route: "order-details",
        cancellationApprovalStatus: approve ? "approved" : "rejected",
      },
    });

    // Save notification for rejection in database.
    // For approval, notifyUserOrderStatus below will persist the explicit "cancelled" status update.
    if (approve !== true) {
      await Notification.create({
        user: recipientId,
        type: "order_status",
        title: "Cancellation Rejected",
        message: `Your cancellation request for Order #${updated.id || updated._id} has been rejected.`,
        orderId: updated.id || updated._id,
        orderStatus: normalizeStatus(updated.status),
        data: { cancellationApprovalStatus: "rejected" },
      });
    }

    // Ensure an explicit cancelled-status notification is saved after approval.
    if (approve === true) {
      await notifyUserOrderStatus(
        recipientId,
        updated.id || updated._id,
        STATUS.CANCELLED,
        { reason: existing.cancellationReason || null }
      );
    }

    // Log admin action
    console.log(`[Admin Action] ${approve ? "Approved" : "Rejected"} cancellation request for Order #${updated.id || updated._id} by admin ${req.user.userId}`);

    return res.status(200).json(updated);
  } catch (_error) {
    console.error("[orders] approve-cancellation error:", _error.message);
    return res.status(500).json({ message: "Failed to process cancellation approval" });
  }
});

module.exports = router;
