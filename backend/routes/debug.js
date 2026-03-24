const express = require("express");
const authJwt = require("../middleware/authJwt");
const User = require("../models/User");

const router = express.Router();

// POST /debug/send-push-direct — admin test endpoint to send raw push directly to logged-in user
router.post("/send-push-direct", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get the current user's push token, or fall back to all registered users if admin has none
    let user = await User.findById(req.user.userId).select("name email pushToken pushTokenType").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If requester has no token but is admin, send to all non-admin users with tokens
    if ((!user.pushToken || !user.pushToken.trim()) && req.user.isAdmin) {
      console.log(`[debug.send-push-direct] Admin has no token, sending to all users with tokens instead`);
      const recipients = await User.find(
        { pushToken: { $exists: true, $ne: null, $ne: "" } },
        "name email pushToken pushTokenType"
      ).lean();

      if (recipients.length === 0) {
        return res.status(400).json({
          message: "No users with push tokens found",
          note: "At least one user needs to log in and grant notifications first",
        });
      }

      console.log(`[debug.send-push-direct] Found ${recipients.length} user(s) with tokens. Sending direct push to all...`);

      const allResults = [];
      for (const recipient of recipients) {
        try {
          if (recipient.pushTokenType === "expo" || recipient.pushToken.startsWith("ExponentPushToken")) {
            const message = {
              to: recipient.pushToken,
              sound: "default",
              priority: "high",
              channelId: "lapsphere-high",
              title: "🔔 DIRECT TEST PUSH",
              body: "This is a direct test. Check if you see a notification popup!",
              data: {
                type: "debug_direct_test",
                timestamp: new Date().toISOString(),
              },
            };

            const response = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            });

            const responseBody = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseBody);
            } catch (e) {
              responseData = { raw: responseBody };
            }

            allResults.push({
              user: { name: recipient.name, email: recipient.email },
              expoStatus: response.status,
              expoResponse: responseData,
            });
          }
        } catch (e) {
          allResults.push({
            user: { name: recipient.name, email: recipient.email },
            error: e.message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "Direct push sent to all registered users",
        sentCount: recipients.length,
        results: allResults,
      });
    }

    if (!user.pushToken || !user.pushToken.trim()) {
      return res.status(400).json({
        message: "User has no push token registered",
        user: { name: user.name, email: user.email },
      });
    }

    console.log(`[debug.send-push-direct] Sending to admin token: ${user.pushToken.substring(0, 40)}...`);
    console.log(`[debug.send-push-direct] Token type: ${user.pushTokenType}`);

    // Direct Expo push send
    if (user.pushTokenType === "expo" || user.pushToken.startsWith("ExponentPushToken")) {
      const message = {
        to: user.pushToken,
        sound: "default",
        priority: "high",
        channelId: "lapsphere-high",
        title: "🔔 DIRECT TEST PUSH",
        body: "This is a direct test. Check if you see a notification popup!",
        data: {
          type: "debug_direct_test",
          timestamp: new Date().toISOString(),
        },
      };

      console.log(`[debug.send-push-direct] Sending Expo message:`, JSON.stringify(message, null, 2));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const responseBody = await response.text();
      console.log(`[debug.send-push-direct] Expo API status: ${response.status}`);
      console.log(`[debug.send-push-direct] Expo API response:`, responseBody);

      let responseData;
      try {
        responseData = JSON.parse(responseBody);
      } catch (e) {
        responseData = { raw: responseBody };
      }

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          message: "Expo API returned error",
          expoStatus: response.status,
          expoResponse: responseData,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Direct Expo push sent to admin device",
        userToken: user.pushToken.substring(0, 20) + "...",
        expoStatus: response.status,
        expoResponse: responseData,
      });
    } else {
      // FCM push
      const admin = require("firebase-admin");
      const config = require("../config");

      if (!config.fcmServiceAccountJson && !config.fcmServiceAccountPath) {
        return res.status(503).json({
          message: "FCM not configured",
          note: "Set FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH in .env",
        });
      }

      const message = {
        tokens: [user.pushToken],
        notification: {
          title: "🔔 DIRECT FCM TEST PUSH",
          body: "This is a direct FCM test. Check if you see a notification popup!",
        },
        data: {
          type: "debug_direct_test",
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "lapsphere-high",
          },
        },
      };

      console.log(`[debug.send-push-direct] Sending FCM message to:`, user.pushToken.substring(0, 30));

      if (admin.apps.length === 0) {
        console.log("[debug.send-push-direct] Firebase not initialized, attempting init...");
        const path = require("path");
        const fs = require("fs");

        let serviceAccount = null;
        if (config.fcmServiceAccountJson) {
          try {
            serviceAccount = JSON.parse(config.fcmServiceAccountJson);
            console.log("[debug.send-push-direct] Loaded Firebase from env JSON");
          } catch (e) {
            console.error("[debug.send-push-direct] Invalid FCM JSON:", e.message);
          }
        }

        if (!serviceAccount && config.fcmServiceAccountPath) {
          const resolvedPath = path.resolve(process.cwd(), config.fcmServiceAccountPath);
          if (fs.existsSync(resolvedPath)) {
            serviceAccount = require(resolvedPath);
            console.log("[debug.send-push-direct] Loaded Firebase from file");
          } else {
            console.error("[debug.send-push-direct] Firebase file not found:", resolvedPath);
          }
        }

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log("[debug.send-push-direct] Firebase initialized");
        } else {
          return res.status(503).json({
            message: "Firebase not configured",
            fcmPath: config.fcmServiceAccountPath,
          });
        }
      }

      const result = await admin.messaging().sendEachForMulticast(message);
      console.log(`[debug.send-push-direct] FCM result:`, result);

      return res.status(200).json({
        success: true,
        message: "Direct FCM push sent to admin device",
        userToken: user.pushToken.substring(0, 20) + "...",
        fcmResult: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          responses: result.responses.map((r) => ({
            success: r.success,
            error: r.error?.code,
          })),
        },
      });
    }
  } catch (error) {
    console.error("[debug.send-push-direct] Error:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: "Debug push send failed",
      error: error.message,
    });
  }
});

module.exports = router;
