# Push Notifications Testing Guide - LapSphere

## Overview
This guide helps you test and verify that push notifications are working correctly in the LapSphere application.

## Prerequisites
- Backend running: `npm start` in the `backend/` directory
- Frontend running: `npm start` in the `frontend-expo/` directory (Expo Go or APK)
- User account created and authenticated

## Testing Checklist

### 1. Verify Token Registration ✅

#### On Frontend (Expo App)
1. Open the app and log in
2. Check the console output for these messages:
   ```
   [Push] Got FCM token: ...
   // OR
   [Push] Got Expo token: ExponentPushToken[...]
   [Push] Token registered successfully
   ```

#### In Database (Terminal)
```bash
# Connect to MongoDB and check
mongo lapsphere
db.users.findOne({ email: "your@email.com" }, { pushToken: 1, pushTokenType: 1 })
# Should show:
# "pushToken": "ExponentPushToken[xxx]" or "fcmToken...",
# "pushTokenType": "expo" or "fcm"
```

### 2. Send Test Notification (Admin Only)

#### Via API
```bash
# Get admin JWT token first
curl -X POST http://localhost:4000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Save the token from response, then send test:
curl -X POST http://localhost:4000/api/v1/promos/test/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Notification",
    "message": "Push notifications working!"
  }'
```

#### Response Example
```json
{
  "success": true,
  "message": "Test notification sent to all users",
  "sent": 3
}
```

#### Expected Result
- App in foreground: Notification banner appears
- App in background: Notification in drawer/notification center
- Both cases: Notification is also saved to database

### 3. Send Broadcast Promo (Admin Only)

```bash
curl -X POST http://localhost:4000/api/v1/promos/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "🎉 Flash Sale!",
    "message": "50% off all Laptops - Limited Time",
    "discountPercent": 50,
    "durationHours": 24
  }'
```

### 4. Send Test via Backend Script

```bash
cd backend
node scripts/testNotifications.js
```

This script will:
- ✅ List all users with registered push tokens
- ✅ Send a test notification to their devices
- ✅ Check Firebase configuration status
- ✅ Display helpful troubleshooting info

### 5. Verify Notifications in App

#### Check Notification Center
1. Open app and navigate to "User" tab → "Notification Center"
2. You should see all notifications:
   - **Push notifications** (delivered via FCM/Expo)
   - **Database notifications** (saved but not pushed)

#### Notifications View
- **Source**: Some show "push" (real-time), some show "database" (saved)
- **Read Status**: Can mark as read/unread
- **Actions**: Tap to navigate to related order or promo

## Troubleshooting

### Issue: No Token Registered

**Check Frontend Logs**
```
[Push] Notification permissions not granted
```
➡️ **Solution**: User needs to grant notification permissions

**Check Frontend Logs**
```
[Push] Not authenticated yet
```
➡️ **Solution**: User needs to log in first

**Check Frontend Logs**
```
[Push] No JWT token available
```
➡️ **Solution**: Session may be expired, try logging in again

### Issue: Test Endpoint Returns "No users with push tokens"

**Check Database**
```bash
node scripts/testNotifications.js
```
This will show exactly which users have tokens.

**Solution**: Open app, ensure permissions are granted, and check console for token registration logs.

### Issue: Expo Push Sends But No Notification Appears

1. Check if app has notification permissions
2. Verify notification channel is configured (Android)
3. Check firewall rules (Expo uses internet)
4. Verify token format: should start with "ExponentPushToken["

### Issue: FCM Not Sending (APK/Dev Build)

1. Verify Firebase service account file exists:
   ```
   backend/lapsphere-78b14-firebase-adminsdk-fbsvc-e271e46558.json
   ```
2. Check Firebase configuration in backend/.env
3. Run `npm install firebase-admin` if missing
4. Check backend logs for `[notifications] Firebase Admin initialized successfully`

## Success Indicators

✅ **Token Registration Working**
- Console shows `[Push] Got [FCM|Expo] token`
- Console shows `[Push] Token registered successfully`
- Database shows user has `pushToken` set

✅ **Test Notification Sent**
- API returns `"sent": X` (X > 0)
- Backend logs show `[notifications] FCM sent` or `[notifications] Expo push sent`
- Device receives notification

✅ **Notifications Display**
- Notification appears in app notification center
- Notification appears in device notification drawer
- Tapping notification navigates correctly

## Backend Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/users/push-token` | POST | JWT | Register device push token |
| `/notifications` | GET | JWT | Fetch user's notifications |
| `/promos/broadcast` | POST | JWT + Admin | Send promo to all users |
| `/promos/test/send-notification` | POST | JWT + Admin | Send test notification |

## Log Locations

**Frontend Console** (Expo)
- Messages prefixed with `[Push]` or `[Notification]`

**Backend Console**
- Messages prefixed with `[notifications]`
- Messages prefixed with `[promos.broadcast]`

## Additional Resources

- Expo Notifications Docs: https://docs.expo.dev/guides/using-notifications/
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- Database: Check `notifications` collection for saved notifications

---

**Need Help?** Check the logs and verify each step of this checklist sequentially.
