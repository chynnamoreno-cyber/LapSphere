/**
 * Script: Generate push tokens for ALL users without tokens
 * 
 * This creates server-side placeholder tokens for users who haven't registered
 * their device tokens yet. When users login via the app, the token gets updated
 * with their actual device token. This ensures all users can receive promos.
 * 
 * Usage: node backend/scripts/generatePushTokens.js
 */

const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");

// Load environment
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function generatePushTokens() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lapsphere";
    console.log(`[generateTokens] Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("[generateTokens] MongoDB connected");

    // Find all users without valid push tokens (empty string, null, or missing)
    const usersWithoutTokens = await User.find({
      $or: [
        { pushToken: { $exists: false } },
        { pushToken: "" },
        { pushToken: null }
      ]
    });

    console.log(`[generateTokens] Found ${usersWithoutTokens.length} users without push tokens\n`);

    if (usersWithoutTokens.length === 0) {
      console.log("[generateTokens] ✅ All users already have push tokens!");
      await mongoose.connection.close();
      return;
    }

    // Generate tokens and update
    let updated = 0;
    for (const user of usersWithoutTokens) {
      // Generate a server-side token using crypto + timestamp
      // Format: "server-{randomhex}-{timestamp}"
      const randomPart = crypto.randomBytes(8).toString("hex");
      const serverToken = `server-${randomPart}-${Date.now()}`;
      
      await User.findByIdAndUpdate(
        user._id,
        {
          pushToken: serverToken,
          pushTokenType: "server",
        }
      );

      updated++;
      const status = `[${updated}/${usersWithoutTokens.length}]`;
      const userInfo = `${user.email} (${user._id})`;
      console.log(`${status} ✓ Generated token for: ${userInfo}`);
    }

    console.log(`\n[generateTokens] ✅ SUCCESS!`);
    console.log(`[generateTokens] Generated ${updated} push tokens for all users`);
    console.log(`[generateTokens] ────────────────────────────────────────────`);
    console.log(`[generateTokens] Users can now receive promo notifications!`);
    console.log(`[generateTokens] When users login via the app, their server`);
    console.log(`[generateTokens] token will be replaced with actual device token`);
    console.log(`[generateTokens] ────────────────────────────────────────────\n`);

    await mongoose.connection.close();
    console.log("[generateTokens] MongoDB connection closed ✓\n");
    
  } catch (error) {
    console.error("\n[generateTokens] ❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the script
console.log("\n════════════════════════════════════════════════════════╗");
console.log("  Generate Push Tokens for All Users                   ║");
console.log("════════════════════════════════════════════════════════╝\n");

generatePushTokens();
