const express = require("express");
const authJwt = require("../middleware/authJwt");
const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");

const router = express.Router();

// POST /promos/broadcast — admin-only promo push broadcast
router.post("/broadcast", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }

    const recipients = await User.find(
      { isAdmin: false, pushToken: { $ne: "" } },
      "pushToken pushTokenType"
    ).lean();

    const tokens = recipients
      .filter((user) => user.pushToken)
      .map((user) => ({ token: user.pushToken, type: user.pushTokenType || "fcm" }));

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: "No customer push tokens found" });
    }

    await sendToTokens(tokens, {
      title,
      body: message,
      data: {
        route: "notifications",
        type: "promo",
      },
    });

    return res.status(200).json({ success: true, sent: tokens.length });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to broadcast promo notification" });
  }
});

module.exports = router;
