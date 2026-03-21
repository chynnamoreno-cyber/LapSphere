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
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    // Base64 payload for profile photos can be large on web; allow bigger text fields.
    fieldSize: 200 * 1024 * 1024,
    fields: 50,
  },
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
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user" });
  }
});

// [MP2] Google sign-in - verifies id_token, finds or creates user, returns JWT
router.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    console.log("[auth/google] Request received. idToken present:", Boolean(idToken));
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }
    if (!config.googleClientIds || config.googleClientIds.length === 0) {
      return res
        .status(503)
        .json({ message: "Google sign-in is not configured. Set GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS in .env" });
    }

    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    console.log("[auth/google] tokeninfo status:", resp.status);
    console.log("[auth/google] token aud:", data?.aud);

    const allowedAudiences = config.googleClientIds;
    console.log("[auth/google] allowed audiences:", allowedAudiences);
    if (data.error || !allowedAudiences.includes(data.aud)) {
      console.log("[auth/google] token rejected. error:", data?.error || "audience mismatch");
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const email = (data.email || "").trim().toLowerCase();
    const name = (data.name || data.email || "User").trim();
    const image = data.picture || "";

    let user = await User.findOne({ email }).lean();
    if (!user) {
      console.log("[auth/google] No existing user. Creating:", email);
      const passwordHash = await bcrypt.hash(
        `social-${Date.now()}-${Math.random().toString(36)}`,
        10
      );
      const newUser = await User.create({
        name,
        email,
        passwordHash,
        phone: "social-signup",
        image,
        isAdmin: false,
        isVerified: true,
      });
      user = newUser.toObject();
    } else {
      console.log("[auth/google] Existing user found:", email);
      if (!user.isVerified) {
        await User.updateOne({ _id: user._id }, { $set: { isVerified: true } });
        user.isVerified = true;
      }
      user.id = user._id.toString();
      delete user._id;
      delete user.passwordHash;
      delete user.pushToken;
      delete user.pushTokenType;
    }

    const payload = {
      userId: user.id || user._id?.toString(),
      email: user.email,
      isAdmin: user.isAdmin || false,
    };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    console.log("[auth/google] Success. Returning JWT for:", email);
    return res.status(200).json({ token, user: payload });
  } catch (err) {
    console.error("[auth/google] Error:", err.message);
    return res.status(500).json({ message: "Google sign-in failed" });
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

// PUT /users/profile/image — upload/update profile photo (MUST come before generic /profile route)
router.put("/profile/image", authJwt, upload.single("image"), async (req, res) => {
  try {
    const parseJson = (raw) => {
      if (raw === undefined || raw === null) return null;
      if (typeof raw === "object") return raw;
      if (typeof raw !== "string") return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const materializeBase64ProfileImage = () => {
      const parsed = parseJson(req.body?.imageBase64);
      let data = String(parsed?.data || "").trim();
      const mimeType = String(parsed?.mime || "").trim() || "image/jpeg";
      if (!data) {
        console.warn(
          `[PUT /users/profile/image] imageBase64 parsed but has no data. mime=${mimeType}`
        );
        return null;
      }

      // Remove data: URI prefix if present
      const commaIdx = data.indexOf(",");
      if (data.startsWith("data:") && commaIdx >= 0) {
        data = data.slice(commaIdx + 1);
      }

      // Validate base64 format (only letters, numbers, +, /, =)
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
        console.warn(`[PUT /users/profile/image] Invalid base64 format`);
        return null;
      }

      try {
        const ext = mimeType.includes("png") ? ".png" : ".jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        const buffer = Buffer.from(data, "base64");
        
        // Validate buffer size (at least 100 bytes, max 5MB)
        if (buffer.length < 100 || buffer.length > 5 * 1024 * 1024) {
          console.warn(`[PUT /users/profile/image] Invalid buffer size: ${buffer.length}`);
          return null;
        }
        
        const filepath = path.join(uploadPath, filename);
        fs.writeFileSync(filepath, buffer);
        return buildImageUrl(req, filename);
      } catch (err) {
        console.error(`[PUT /users/profile/image] Base64 processing error:`, err.message);
        return null;
      }
    };

    let image = "";
    const hasBase64 = Boolean(req.body?.imageBase64);
    const hasFile = Boolean(req.file);
    
    console.log(
      `[PUT /users/profile/image] Method: ${hasFile ? "multipart-file" : hasBase64 ? "base64" : "none"}, hasFile=${hasFile}, hasBase64=${hasBase64}`
    );

    if (hasFile) {
      // Multipart file upload succeeded
      image = buildImageUrl(req, req.file.filename);
      console.log(`[PUT /users/profile/image] Using file upload. Filename: ${req.file.filename}, Size: ${req.file.size}`);
    } else if (hasBase64) {
      // Try base64 upload
      const fromBase64 = materializeBase64ProfileImage();
      if (!fromBase64) {
        console.warn(`[PUT /users/profile/image] Base64 conversion failed or invalid`);
        return res.status(400).json({ message: "Invalid image: base64 decode failed or image too small" });
      }
      image = fromBase64;
    } else {
      // Neither file nor base64 provided
      console.warn(`[PUT /users/profile/image] No image data provided (no file, no base64)`);
      return res.status(400).json({ message: "Profile image is required (no image data received)" });
    }

    if (!image) {
      console.warn(`[PUT /users/profile/image] Image URL generation failed`);
      return res.status(400).json({ message: "Failed to process image" });
    }

    const user = await User.findByIdAndUpdate(req.user.userId, { image }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[PUT /users/profile/image] Success. User ID: ${req.user.userId}, Image: ${image}`);
    return res.status(200).json(user.toJSON());
  } catch (err) {
    console.error(`[PUT /users/profile/image] Unexpected error:`, err.message);
    return res.status(500).json({ message: "Failed to update profile image" });
  }
});

// PUT /users/profile — update profile data (generic route after specific /profile/image route)
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
