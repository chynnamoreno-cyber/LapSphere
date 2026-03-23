# Push Notification Debugging Guide - LapSphere

## Quick Diagnosis Steps

### Step 1: Check Frontend Token Registration
1. Open your app in Expo Go/APK
2. Open the console in Expo Go (shake device or press "m" in terminal)
3. Look for these messages:
   - ✅ `[Push] Got [Expo|FCM] token: ...` — Token was obtained
   - ✅ `[Push] Token registered successfully` — Token was sent to backend
   - ❌ `[Push] Not authenticated yet` — User needs to log in first
   - ❌ `[Push] Notification permissions not granted` — Need to grant permissions

### Step 2: Verify Token Saved to Database

**Option A: Using MongoDB CLI**
```bash
mongo
use lapsphere
db.users.findOne({ email: "your@email.com" }, { name: 1, pushToken: 1, pushTokenType: 1 })
```

**Option B: Using API (need JWT token)**
```bash
curl -X GET http://localhost:4000/api/v1/users/push-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response showing:
```json
{
  "hasToken": true,
  "tokenType": "expo",  // or "fcm"
  "tokenPreview": "ExponentPushToken[abc..."
}
```

### Step 3: Test Notification Sending

**Method 1: Test Endpoint (Simple)**
```bash
curl -X POST http://localhost:4000/api/v1/promos/test/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Method 2: Specific User**
```bash
# First, get a user's ID from database or list endpoint
curl -X POST http://localhost:4000/api/v1/promos/test/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"userId": "USER_ID_HERE"}'
```

### Step 4: Check Backend Logs

When you send a test notification, watch the backend console for:

```
[notifications] sendToTokens: Routing 1 token(s)
[notifications] Token breakdown: 0 FCM, 1 Expo, 0 Server
[notifications] Sample Expo token: ExponentPushToken[abc...
[notifications] Sending to 1 Expo token(s)...
[notifications] Sending Expo push to 1 token(s)...
[notifications] Expo API response: {"data":[{"status":"ok",...}]}
```

## Common Issues & Solutions

### Issue: "No users with push tokens found"
**Cause:** No users have registered tokens yet

**Solution:**
1. Ensure at least one user is logged in
2. Check that notifications permissions were granted:
   - iOS: Settings > YourApp > Notifications > Allow Notifications
   - Android: Settings > Apps > YourApp > Permissions > Notifications
3. Look for `[Push] Notification permissions not granted` in console

**Fix Example:**
```javascript
// Force permission request by calling from app
import * as Notifications from 'expo-notifications';
const { status } = await Notifications.requestPermissionsAsync();
console.log('Permission status:', status);
```

### Issue: Token Registered But No Notification Received

**Check Backend:**
```
[promos.test] Sending test notification to 1 users
[notifications] sendToTokens: Routing 1 token(s)
[notifications] Sending to 1 Expo token(s)...
[notifications] Expo API response: {"data":[{"status":"ok"}]}
```

✅ Backend sent successfully. Problem is device/Expo side.

**Check Expo:**
1. Device is connected to internet
2. Notification permissions are granted
3. App has foreground notification handler set (it does)
4. Token is valid (hasn't expired)

### Issue: Registration Failed - Status 401

**Cause:** JWT token invalid or expired

**Solution:**
1. Log out and log back in
2. Get fresh JWT token
3. Try registration again

### Issue: Registration Failed - Status 500

**Check Backend:**
- User ID mismatched
- Database connection issues
- Token too long or invalid format

**Debug:**
```javascript
// Add to frontend App.js after token registration
const response = await fetch(...)
if (!response.ok) {
  const text = await response.text();
  console.log('Raw response:', text);
  const data = await response.json().catch(() => ({}));
  console.log('Error details:', data);
}
```

## Full Testing Flow

1. **Backend Start**
   ```bash
   cd backend
   npm install  # if needed
   npm start
   ```
   
   Look for: `[server] Listening on port 4000`

2. **Frontend Start**
   ```bash
   cd frontend-expo
   npm install  # if needed
   npm start
   ```

3. **Create Test User**
   - Sign up or log in with test account
   - Grant notification permissions when prompted
   - Watch console for `[Push] Got Expo token`
   - Wait for `[Push] Token registered successfully`

4. **Check Registration**
   ```bash
   # From another terminal
   curl -X GET http://localhost:4000/api/v1/users/push-token \
     -H "Authorization: Bearer JWT_FROM_LOGIN"
   ```

5. **Send Test**
   ```bash
   curl -X POST http://localhost:4000/api/v1/promos/test/send-notification \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer JWT_FROM_LOGIN"
   ```

6. **Check Response**
   - Should show `"sent": 1` if device has token
   - Device should receive notification
   - Check app console: `[Notification] Received in foreground: ...`

## Console Log Reference

### Frontend (`[Push]` prefix)
- `Got [FCM|Expo] token` — Token object created
- `Token registered successfully` — Backend accepted token
- `Token unchanged since last` — Skipped (optimization)
- `Not authenticated yet` — User not logged in (will retry)

### Backend (`[notifications]` prefix)
- `Sending Expo push to X token(s)` — Sending to Expo API
- `Expo API response:` — Response from Expo
- `Sample Expo token: ExponentPushToken[` — Token format

### Backend (`[promos.test]` prefix)  
- `Looking up user` — Finding user by ID
- `has [TOKEN_TYPE] token` — Token found and type
- `Sending to X users` — Number of devices getting notified
- `Sending to 1 token(s)` — About to call sendToTokens

## Token Format Reference

**Expo Token** (Expo Go)
```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]
```

**FCM Token** (APK/Dev Build)
```
c6pXOBiC3qXAB7_ZXHJq2J:APA91bEsJ...
```

## Debugging Helpers

### View Push Token Locally
```javascript
import { getLocalPushTokenInfo, debugPushTokenStatus } from './assets/common/pushTokenDebug';

// In a component or useEffect:
debugPushTokenStatus().then(info => {
  console.log("Local:", info.local);
  console.log("Backend:", info.backend);
});
```

### Force Re-registration
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// This will force next check to re-register
await AsyncStorage.removeItem('registeredPushToken');
```

## API Endpoints Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/users/push-token` | POST | JWT | Register token |
| `/users/push-token` | GET | JWT | Check token status |
| `/promos/test/send-notification` | POST | JWT + Admin | Send test |
| `/promos/broadcast` | POST | JWT + Admin | Broadcast to all |

## If Still Not Working

1. ✅ Check frontend console for token registration messages
2. ✅ Check backend console for sending confirmations
3. ✅ Verify token in database: `db.users.findOne()` 
4. ✅ Test with simple curl first (no app complications)
5. ✅ Check Network tab for API errors
6. ✅ Verify Expo account connected (if using Expo Go)

---

**Created:** 2026-03-21  
**Last Updated:** After push notification debugging session
