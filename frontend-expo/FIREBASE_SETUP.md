# Firebase Integration Setup Guide

Complete Firebase integration for LapSphere Expo app including Authentication, Firestore, Cloud Storage, and Push Notifications.

## What Was Set Up

### 1. Frontend Firebase Configuration ✅
- [assets/common/firebaseConfig.js](firebaseConfig.js) - Public Firebase config
- [assets/common/firebaseInit.js](firebaseInit.js) - Firebase initialization module with Expo Go fallback
- `.env.local` - Environment variables template for Firebase credentials
- Firebase package added to `package.json`

### 2. App Integration ✅
- App.js now initializes Firebase at startup
- Graceful fallback if Firebase is unavailable
- EAS secrets configured for production builds

### 3. Push Notifications ✅
- Existing setup enhanced with Firebase Cloud Messaging support
- Fallback to Expo notifications in Expo Go
- Push tokens registered with backend

## Next Steps: Get Firebase Credentials

### Step 1: Get Your Firebase Web Config

1. Go to **Firebase Console**: https://console.firebase.google.com/project/lapsphere-78b14/settings/general

2. In **Project Settings**, scroll to "Your apps"

3. If you don't have a Web app yet:
   - Click **"Create app"** → Select **Web**
   - Register the app

4. Copy the firebaseConfig object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDv_placeholder_xxxxx",
  authDomain: "lapsphere-78b14.firebaseapp.com",
  projectId: "lapsphere-78b14",
  storageBucket: "lapsphere-78b14.appspot.com",
  messagingSenderId: "1061265006776",
  appId: "1:1061265006776:web:xxxxx_placeholder",
};
```

### Step 2: Configure Local Environment

1. **Edit `.env.local`** in your frontend-expo folder:

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDv_xxxxx
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1061265006776
EXPO_PUBLIC_FIREBASE_APP_ID=1:1061265006776:web:xxxxx
```

2. Save the file

### Step 3: Configure EAS Secrets (for Production Builds)

Run these commands to set secrets for production builds:

```bash
cd frontend-expo

# Set the secrets
eas secret create --scope project --name FIREBASE_API_KEY --value "AIzaSyDv_xxxxx"
eas secret create --scope project --name FIREBASE_MESSAGING_SENDER_ID --value "1061265006776"
eas secret create --scope project --name FIREBASE_APP_ID --value "1:1061265006776:web:xxxxx"
```

Or use EAS CLI interactively:
```bash
eas secret
```

## Firebase Services Available

Once configured, you can use:

### Authentication
```javascript
import { getFirebaseAuth } from './assets/common/firebaseInit';
const auth = await getFirebaseAuth();
```

### Firestore
```javascript
import { getFirebaseFirestore } from './assets/common/firebaseInit';
const db = await getFirebaseFirestore();
```

### Cloud Storage
```javascript
import { getFirebaseStorage } from './assets/common/firebaseInit';
const storage = await getFirebaseStorage();
```

### Push Notifications
Push token registration is automatic and already integrated. The app will:
1. Request notification permissions
2. Get device push token (FCM) or Expo token
3. Register with backend via `/users/push-token` endpoint

## Troubleshooting

### Firebase Not Initializing
- Check `.env.local` has correct values
- Verify API key is correct from Firebase Console
- Check `console.log` for `[Firebase]` messages

### Push Notifications Not Working
- Ensure notification permissions are granted on device
- Check backend is receiving tokens at `/users/push-token`
- In Expo Go, FCM won't work (uses Expo notification service instead)

### Expo Go Limitations
When running in Expo Go:
- Firebase iOS SDK may not be available
- Uses Expo Notifications service instead
- FCM device tokens won't be generated
- When you build an APK/dev build, full Firebase works

## Files Added/Modified

### Created:
- `assets/common/firebaseConfig.js` - Public Firebase configuration
- `assets/common/firebaseInit.js` - Firebase initialization with error handling
- `.env.local` - Local environment variables

### Modified:
- `package.json` - Added firebase dependency
- `app.json` - Added Firebase config to extra section
- `eas.json` - Added environment variables for builds
- `App.js` - Added Firebase initialization call

## Backend Integration

Your backend already has Firebase Admin SDK configured at:
- `backend/lapsphere-78b14-firebase-adminsdk-fbsvc-ea3e80c3f4.json`

The backend uses this for:
- Sending push notifications
- Firestore admin operations
- Cloud Storage admin access

**Important**: Never commit the service account key to version control. It's in `.gitignore`.

## Testing

### Local Development
```bash
npm start  # Start Expo
# Scan QR code with Expo Go
# Notifications should work with Expo service
```

### Development Build
```bash
eas build --platform=android --profile=development
# Install on device/emulator
# Full Firebase functionality enabled
```

### Production Build
```bash
eas build --platform=android --profile=production
# Make sure EAS secrets are set first
```

## References

- Firebase Console: https://console.firebase.google.com/project/lapsphere-78b14
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Firebase with React Native: https://firebase.google.com/docs/database/react-native/start
