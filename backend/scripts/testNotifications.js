/**
 * Test script to verify push notifications are working
 * Usage: node backend/scripts/testNotifications.js
 */

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");

async function testNotifications() {
  try {
    console.log("[Test] Starting push notifications test...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lapsphere";
    console.log(`[Test] Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("[Test] ✅ MongoDB connected\n");

    // Find users with push tokens
    const usersWithTokens = await User.find(
      { pushToken: { $exists: true, $ne: "" } },
      "name email pushToken pushTokenType"
    ).limit(5).lean();

    console.log(`[Test] Found ${usersWithTokens.length} user(s) with push tokens:`);
    usersWithTokens.forEach((user) => {
      console.log(`  - ${user.name} (${user.email}): ${user.pushToken.substring(0, 30)}... [${user.pushTokenType}]`);
    });

    if (usersWithTokens.length === 0) {
      console.log("\n⚠️  No users with push tokens found!");
      console.log("   Users need to:");
      console.log("   1. Log in to the app");
      console.log("   2. Grant notification permissions");
      console.log("   3. Token will be auto-registered\n");
      await mongoose.connection.close();
      return;
    }

    // Extract tokens
    const tokens = usersWithTokens
      .filter((u) => u.pushToken)
      .map((u) => ({ token: u.pushToken, type: u.pushTokenType || "fcm" }));

    console.log(`\n[Test] Sending test notification to ${tokens.length} device(s)...\n`);

    // Send test notification
    const testPayload = {
      title: "LapSphere Test Notification ✅",
      body: "Push notifications are working correctly!",
      data: {
        type: "test",
        message: "This is a test from the backend",
        timestamp: new Date().toISOString(),
      },
    };

    await sendToTokens(tokens, testPayload);

    console.log("\n[Test] ✅ Test notification sent successfully!");
    console.log("   Check your device/emulator for the notification\n");

    // Check Firebase status
    console.log("[Test] Firebase Status:");
    const firebaseFile = process.env.FCM_SERVICE_ACCOUNT_PATH;
    if (firebaseFile) {
      const fs = require("fs");
      const resolvedPath = path.resolve(process.cwd(), firebaseFile);
      if (fs.existsSync(resolvedPath)) {
        console.log(`  ✅ Firebase service account file found: ${resolvedPath}`);
      } else {
        console.log(`  ⚠️  Firebase service account file NOT found: ${resolvedPath}`);
        console.log("     (This is OK for Expo Go testing, but required for APK)");
      }
    } else {
      console.log("  ⚠️  FCM_SERVICE_ACCOUNT_PATH not configured");
      console.log("     (This is OK for Expo Go testing)");
    }

    await mongoose.connection.close();
    console.log("\n[Test] Done!");

  } catch (error) {
    console.error("[Test] Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testNotifications();
