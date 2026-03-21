const express = require("express");
const authJwt = require("../middleware/authJwt");
const Notification = require("../models/Notification");

const router = express.Router();

// GET /notifications - Get all notifications for authenticated user
router.get("/", authJwt, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const query = { user: req.user.userId };
    if (unreadOnly === "true" || unreadOnly === true) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate("orderId", "id _id status totalPrice dateOrdered")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Notification.countDocuments(query);

    return res.status(200).json({
      data: notifications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[notifications] GET error:", error.message);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// GET /notifications/unread-count - Get count of unread notifications
router.get("/unread-count", authJwt, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user.userId,
      read: false,
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("[notifications] GET unread-count error:", error.message);
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

// GET /notifications/:id - Get a single notification
router.get("/:id", authJwt, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate("orderId", "id _id status totalPrice dateOrdered")
      .lean();

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(notification);
  } catch (error) {
    console.error("[notifications] GET by ID error:", error.message);
    return res.status(500).json({ message: "Failed to fetch notification" });
  }
});

// PUT /notifications/:id/read - Mark notification as read
router.put("/:id/read", authJwt, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json(notification);
  } catch (error) {
    console.error("[notifications] PUT read error:", error.message);
    return res.status(500).json({ message: "Failed to update notification" });
  }
});

// PUT /notifications/mark-all-read - Mark all notifications as read
router.put("/mark-all-read", authJwt, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.userId, read: false },
      { read: true, readAt: new Date() }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("[notifications] PUT mark-all-read error:", error.message);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

// DELETE /notifications/:id - Delete a notification
router.delete("/:id", authJwt, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Notification.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("[notifications] DELETE error:", error.message);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

module.exports = router;
