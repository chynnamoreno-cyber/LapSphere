# Firebase Setup - Quick Reference

## ✅ What's Done
- [x] Firebase initialization module created
- [x] Firebase package installed  
- [x] App.js configured to initialize Firebase
- [x] EAS secrets setup for production builds
- [x] Push notifications enhanced with FCM support
- [x] Complete documentation in FIREBASE_SETUP.md

## 🚀 Next: Add Your Firebase Credentials

### 1️⃣ Get Credentials (5 minutes)
```
Go to: https://console.firebase.google.com/project/lapsphere-78b14/settings/general
→ Find "Your apps" section
→ Copy the Web app config
```

### 2️⃣ Add to .env.local
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1061265006776  
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID_HERE
```

### 3️⃣ Set EAS Secrets (for production builds)
```bash
cd frontend-expo
eas secret create --scope project --name FIREBASE_API_KEY --value "YOUR_API_KEY"
eas secret create --scope project --name FIREBASE_MESSAGING_SENDER_ID --value "1061265006776"
eas secret create --scope project --name FIREBASE_APP_ID --value "YOUR_APP_ID"
```

## 📁 New Files Created
```
frontend-expo/
├── assets/common/
│   ├── firebaseConfig.js      (Firebase configuration)
│   └── firebaseInit.js        (Initialization with error handling)
├── .env.local                  (Environment variables - YOU FILL THIS IN)
├── FIREBASE_SETUP.md           (Complete setup guide)
└── package.json               (Updated: firebase@^10.7.0 added)
```

## 📝 Files Modified
- `App.js` - Calls initializeFirebase() at startup
- `app.json` - Firebase config in extra section  
- `eas.json` - Environment variables for builds

## 🔧 Using Firebase in Your Code

### Check if Firebase is available
```javascript
import { isFirebaseAvailable } from './assets/common/firebaseInit';
if (isFirebaseAvailable()) {
  // Use Firebase services
}
```

### Auth Example
```javascript
import { getFirebaseAuth } from './assets/common/firebaseInit';
const auth = await getFirebaseAuth();
```

### Firestore Example  
```javascript
import { getFirebaseFirestore } from './assets/common/firebaseInit';
const db = await getFirebaseFirestore();
```

### Storage Example
```javascript
import { getFirebaseStorage } from './assets/common/firebaseInit';
const storage = await getFirebaseStorage();
```

## 📱 Push Notifications

Already working! When configured:
- **Dev (Expo Go)**: Uses Expo notification service
- **Production (APK)**: Uses Firebase Cloud Messaging (FCM)
- **Automatic**: Token registration happens on login

## 🐛 Debugging

```javascript
// Check Firebase status
import { isFirebaseAvailable } from './assets/common/firebaseInit';
console.log('Firebase available:', isFirebaseAvailable());

// Watch console for [Firebase] prefix logs
```

## 📚 See Also
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Full documentation
- [Backend Firebase Config](../../backend/lapsphere-78b14-firebase-adminsdk-fbsvc-ea3e80c3f4.json) - Server credentials (never share)
