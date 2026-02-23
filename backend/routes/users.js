const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const config = require("../config");
const authJwt = require("../middleware/authJwt");
const User = require("../models/User");

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

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function buildImageUrl(req, filename) {
  if (!filename) return "";
  return `${req.protocol}://${req.get("host")}/${config.uploadDir}/${filename}`;
}

router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const isAdmin = toBoolean(req.body.isAdmin);

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "name, email, password, and phone are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const image = req.file ? buildImageUrl(req, req.file.filename) : "";

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      phone: String(phone).trim(),
      image,
      isAdmin,
    });

    return res.status(201).json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    return res.status(200).json({ token, user: payload });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to login" });
  }
});

router.get("/:id", authJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.userId;
    const requesterIsAdmin = req.user?.isAdmin === true;

    if (!requesterIsAdmin && requesterId !== id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.toJSON());
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load user profile" });
  }
});

router.put("/profile", authJwt, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "deliveryAddress1",
      "deliveryAddress2",
      "deliveryCity",
      "deliveryZip",
      "deliveryCountry",
      "deliveryLocation",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim();
    }
    if (typeof updates.phone === "string") {
      updates.phone = updates.phone.trim();
    }
    if (typeof updates.deliveryAddress1 === "string") {
      updates.deliveryAddress1 = updates.deliveryAddress1.trim();
    }
    if (typeof updates.deliveryAddress2 === "string") {
      updates.deliveryAddress2 = updates.deliveryAddress2.trim();
    }
    if (typeof updates.deliveryCity === "string") {
      updates.deliveryCity = updates.deliveryCity.trim();
    }
    if (typeof updates.deliveryZip === "string") {
      updates.deliveryZip = updates.deliveryZip.trim();
    }
    if (typeof updates.deliveryCountry === "string") {
      updates.deliveryCountry = updates.deliveryCountry.trim();
    }

    if (updates.deliveryLocation) {
      const { latitude, longitude } = updates.deliveryLocation;
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "deliveryLocation must include numeric latitude and longitude" });
      }

      updates.deliveryLocation = { latitude: lat, longitude: lng };
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.toJSON());
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

// POST /users/push-token — save device push token for the current user
router.post("/push-token", authJwt, async (req, res) => {
  try {
    const { token, type } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Push token is required" });
    }

    const tokenType = type || (token.startsWith("ExponentPushToken") ? "expo" : "fcm");
    console.log(`[POST /push-token] Saving ${tokenType} push token for user ${req.user.userId}: ${token.substring(0, 30)}...`);
    await User.findByIdAndUpdate(req.user.userId, {
      pushToken: String(token),
      pushTokenType: tokenType,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[POST /push-token] Error:', error.message);
    return res.status(500).json({ message: "Failed to save push token" });
  }
});

module.exports = router;
