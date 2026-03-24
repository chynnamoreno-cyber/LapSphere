/**
 * Fix script: Correct FCM/Expo token type mismatches in database
 * Run: node backend/scripts/fixTokenTypes.js
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function fixTokenTypes() {
  try {
    console.log("[fixTokenTypes] Starting token type correction...\n");

    const mongoUri = process.env.CONNECTION_STRING || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("CONNECTION_STRING or MONGO_URI not set in .env");
    }

    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || "ITCP_database",
    });
    console.log("[fixTokenTypes] MongoDB connected\n");

    // Find all users with Expo tokens stored as wrong type
    const expoTokensWrongType = await User.find({
      pushToken: { $regex: "^ExponentPushToken" },
      pushTokenType: { $ne: "expo", $ne: "" },
    }).select("name email pushToken pushTokenType");

    console.log(`[fixTokenTypes] Found ${expoTokensWrongType.length} Expo tokens with wrong type:\n`);
    expoTokensWrongType.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email} - Currently: ${u.pushTokenType}, Should be: expo`);
    });

    if (expoTokensWrongType.length > 0) {
      const result = await User.updateMany(
        { pushToken: { $regex: "^ExponentPushToken" } },
        { $set: { pushTokenType: "expo" } }
      );

      console.log(`\n[fixTokenTypes] ✅ Fixed ${result.modifiedCount} Expo tokens\n`);
    }

    // Also restore any truly broken FCM tokens that start with "ExponentPushToken"
    const brokenFcmTokens = await User.countDocuments({
      pushToken: { $regex: "^ExponentPushToken" },
      pushTokenType: "fcm",
    });

    if (brokenFcmTokens > 0) {
      console.log(`[fixTokenTypes] Found ${brokenFcmTokens} more broken FCM-typed Expo tokens, fixing...`);
      await User.updateMany(
        { pushToken: { $regex: "^ExponentPushToken" }, pushTokenType: "fcm" },
        { $set: { pushTokenType: "expo" } }
      );
      console.log(`[fixTokenTypes] ✅ Fixed ${brokenFcmTokens} additional tokens\n`);
    }

    // List all users now with tokens
    const allWithTokens = await User.find(
      { pushToken: { $exists: true, $ne: "" } },
      "name email pushToken pushTokenType"
    ).lean();

    console.log(`[fixTokenTypes] Final token list (${allWithTokens.length} user(s)):\n`);
    allWithTokens.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email} [${u.pushTokenType}] - ${u.pushToken.substring(0, 30)}...`);
    });

    console.log("\n[fixTokenTypes] ✅ Done! Push notifications should work now.\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("[fixTokenTypes] Error:", error.message);
    process.exit(1);
  }
}

fixTokenTypes();
