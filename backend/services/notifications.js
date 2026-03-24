const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const User = require("../models/User");

let firebaseInitialized = false;

function sanitizeFcmData(input) {
  const raw = input && typeof input === "object" ? input : {};
  const out = {};

  Object.entries(raw).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string") {
      out[key] = value;
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
      return;
    }
    try {
      out[key] = JSON.stringify(value);
    } catch (_error) {
      out[key] = String(value);
    }
  });

  return out;
}

async function resolveBroadcastTokens(inputTokens = []) {
  const allUsers = await User.find(
    { pushToken: { $exists: true, $ne: null, $ne: "" } },
    "pushToken pushTokenType"
  ).lean();

  const byToken = new Map();

  for (const user of allUsers) {
    const token = String(user?.pushToken || "").trim();
    if (!token) continue;
    byToken.set(token, { token, type: user?.pushTokenType || "fcm" });
  }

  // Include explicitly provided tokens too, in case they are newer than DB snapshot.
  for (const item of inputTokens || []) {
    if (typeof item === "object" && item?.token) {
      const token = String(item.token).trim();
      if (!token) continue;
      byToken.set(token, { token, type: item.type || (token.startsWith("ExponentPushToken") ? "expo" : "fcm") });
    } else if (typeof item === "string") {
      const token = item.trim();
      if (!token) continue;
      byToken.set(token, { token, type: token.startsWith("ExponentPushToken") ? "expo" : "fcm" });
    }
  }

  return Array.from(byToken.values());
}

async function clearStaleTokens(tokens = []) {
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (uniqueTokens.length === 0) return;

  try {
    const result = await User.updateMany(
      { pushToken: { $in: uniqueTokens } },
      { $set: { pushToken: "", pushTokenType: "" } }
    );
    console.log(`[notifications] Cleared stale tokens: ${result.modifiedCount || 0}`);
  } catch (error) {
    console.warn("[notifications] Failed to clear stale tokens:", error.message);
  }
}

function initFirebase() {
  if (firebaseInitialized) return;
  let serviceAccount = null;

  if (config.fcmServiceAccountJson) {
    try {
      serviceAccount = JSON.parse(config.fcmServiceAccountJson);
      console.log("[notifications] Loaded Firebase service account from env JSON");
    } catch (error) {
      console.warn("[notifications] Invalid FCM_SERVICE_ACCOUNT_JSON:", error.message);
    }
  }

  if (!serviceAccount && config.fcmServiceAccountPath) {
    const resolvedPath = path.resolve(process.cwd(), config.fcmServiceAccountPath);
    if (fs.existsSync(resolvedPath)) {
      serviceAccount = require(resolvedPath);
      console.log("[notifications] Loaded Firebase service account from file path");
    } else {
      console.warn(`[notifications] Service account file not found: ${resolvedPath}`);
    }
  }

  if (!serviceAccount) {
    console.warn("[notifications] Missing Firebase credentials. Set FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH.");
    return;
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  firebaseInitialized = true;
  console.log("[notifications] Firebase Admin initialized successfully");
}

// Send via Firebase Cloud Messaging (for FCM device tokens from APK)
async function sendFCM(tokens, title, body, data) {
  initFirebase();
  if (!firebaseInitialized || tokens.length === 0) return;

  const fcmData = sanitizeFcmData(data);

  const message = {
    tokens,
    notification: { title: title || "", body: body || "" },
    data: fcmData,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "lapsphere-high",
      },
    },
  };

  console.log(`[notifications] FCM data keys: ${Object.keys(fcmData).join(", ") || "(none)"}`);

  try {
    const result = await admin.messaging().sendEachForMulticast(message);
    console.log(`[notifications] FCM sent: ${result.successCount} success, ${result.failureCount} failed`);

    const staleTokens = [];
    result.responses.forEach((entry, index) => {
      if (!entry?.success) {
        const code = entry?.error?.code || "";
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          staleTokens.push(tokens[index]);
        }
      }
    });
    await clearStaleTokens(staleTokens);
  } catch (error) {
    console.warn("[notifications] FCM send error:", error.message);
  }
}

// Send via Expo Push API (for Expo Push Tokens from Expo Go)
async function sendExpo(tokens, title, body, data) {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    priority: "high",
    channelId: "lapsphere-high",
    title: title || "",
    body: body || "",
    data: data || {},
  }));

  console.log(`[notifications] Sending Expo push to ${tokens.length} token(s)...`);

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[notifications] Expo API error ${response.status}:`, errorText);
      return;
    }

    const result = await response.json();
    console.log(`[notifications] Expo API response:`, JSON.stringify(result, null, 2));

    // Parse response - can be either array or object with data property
    const receipts = Array.isArray(result) ? result : (result?.data || []);
    console.log(`[notifications] Expo push sent to ${tokens.length} token(s). Receipts:`, 
      receipts.map(r => r?.status || 'unknown').join(', ')
    );

    // Check for stale tokens
    const staleTokens = [];
    if (Array.isArray(receipts)) {
      receipts.forEach((entry, index) => {
        if (entry?.status === "error") {
          const errorMsg = entry?.details?.error || entry?.message || "";
          console.log(`[notifications] Expo error for token ${index}: ${errorMsg}`);
          
          if (errorMsg.includes("DeviceNotRegistered") || errorMsg.includes("invalid")) {
            staleTokens.push(tokens[index]);
          }
        }
      });
    }

    if (staleTokens.length > 0) {
      await clearStaleTokens(staleTokens);
    }
  } catch (error) {
    console.error("[notifications] Expo push error:", error.message, error.stack);
  }
}

// Main function - routes tokens to the correct service
async function sendToTokens(tokens, payload) {
  let targetTokens = Array.isArray(tokens) ? tokens : [];

  if (config.pushNotifyAllUsers) {
    targetTokens = await resolveBroadcastTokens(targetTokens);
    console.log(`[notifications] PUSH_NOTIFY_ALL_USERS=true, broadcasting to ${targetTokens.length} token(s)`);
  }

  if (!targetTokens || targetTokens.length === 0) {
    console.warn("[notifications] sendToTokens called with no tokens");
    return;
  }

  const { title, body, data } = payload || {};

  console.log(`[notifications] sendToTokens: Routing ${targetTokens.length} token(s)`);
  console.log(`[notifications] Payload: title="${title}", body="${body}"`);

  // Separate tokens by type
  const fcmTokens = [];
  const expoTokens = [];
  const serverTokens = [];

  for (const token of targetTokens) {
    if (typeof token === "object" && token.token) {
      // { token: "...", type: "fcm"|"expo"|"server" }
      if (token.type === "server") {
        serverTokens.push(token.token);
      } else if (token.type === "expo" || token.token.startsWith("ExponentPushToken")) {
        expoTokens.push(token.token);
      } else {
        fcmTokens.push(token.token);
      }
    } else if (typeof token === "string") {
      if (token.startsWith("server-")) {
        serverTokens.push(token);
      } else if (token.startsWith("ExponentPushToken")) {
        expoTokens.push(token);
      } else {
        fcmTokens.push(token);
      }
    }
  }

  console.log(`[notifications] Token breakdown: ${fcmTokens.length} FCM, ${expoTokens.length} Expo, ${serverTokens.length} Server`);

  // Log sample tokens (first 40 chars)
  if (fcmTokens.length > 0) {
    console.log(`[notifications] Sample FCM token: ${fcmTokens[0].substring(0, 40)}...`);
  }
  if (expoTokens.length > 0) {
    console.log(`[notifications] Sample Expo token: ${expoTokens[0].substring(0, 40)}...`);
  }

  const promises = [];
  if (fcmTokens.length > 0) {
    console.log(`[notifications] Sending to ${fcmTokens.length} FCM token(s)...`);
    promises.push(sendFCM(fcmTokens, title, body, data));
  }
  if (expoTokens.length > 0) {
    console.log(`[notifications] Sending to ${expoTokens.length} Expo token(s)...`);
    promises.push(sendExpo(expoTokens, title, body, data));
  }

  const results = await Promise.allSettled(promises);
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[notifications] Promise ${i} rejected:`, result.reason?.message);
    }
  });

  console.log("[notifications] All send operations completed");
}

/**
 * Send notification to specific user(s) with optional database persistence
 * @param {string|string[]} userIds - User ID or array of user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {object} options - { type, orderId, data, saveToDB }
 */
async function sendNotificationToUsers(userIds, title, body, options = {}) {
  const { type = "general", orderId = null, data = {}, saveToDB = true } = options;
  const targetUserIds = Array.isArray(userIds) ? userIds : [userIds];

  console.log(`[sendNotificationToUsers] Sending to ${targetUserIds.length} user(s): "${title}"`);

  try {
    // Fetch users and their push tokens
    const users = await User.find(
      { _id: { $in: targetUserIds } },
      "pushToken pushTokenType"
    ).lean();

    const tokensToSend = users
      .filter((u) => u.pushToken && u.pushToken.trim() !== "")
      .map((u) => ({ token: u.pushToken, type: u.pushTokenType || "fcm" }));

    // Send push notifications if tokens available
    if (tokensToSend.length > 0) {
      console.log(`[sendNotificationToUsers] Sending push to ${tokensToSend.length} token(s)`);
      await sendToTokens(tokensToSend, { title, body, data });
    } else {
      console.log(`[sendNotificationToUsers] No push tokens found for users`);
    }

    // Save to database if requested
    if (saveToDB) {
      const Notification = require("../models/Notification");
      const notificationDocs = targetUserIds.map((userId) => ({
        user: userId,
        type,
        title,
        message: body,
        orderId: orderId || null,
        data,
      }));
      await Notification.insertMany(notificationDocs);
      console.log(`[sendNotificationToUsers] Saved ${notificationDocs.length} notification(s) to database`);
    }

    return { success: true, sentCount: tokensToSend.length };
  } catch (error) {
    console.error("[sendNotificationToUsers] Error:", error.message);
    throw error;
  }
}

module.exports = { sendToTokens, sendNotificationToUsers };
