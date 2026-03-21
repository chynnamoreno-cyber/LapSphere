# Firebase + EAS Setup Guide for Push Notifications

## Your Current Configuration
- **Package Name**: `com.peakplay.itcp239.dev` (already set in app.json ✅)
- **EAS Project ID**: `6f747b51-b33e-4c6e-9d11-89bf760ec81a` (already set ✅)
- **EAS Credentials**: Not yet configured ❌

---

## Step-by-Step Setup

### PART 1: Firebase Console Setup

#### Step 1.1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing project for LapSphere
3. Enter project name: `LapSphere-ECommerce` (or any name)
4. Click **"Continue"**

#### Step 1.2: Add Android App
1. In Firebase project dashboard, click **"Add App"**
2. Select **Android** icon
3. Fill in Android Package Name: **`com.peakplay.itcp239.dev`** (MUST match app.json)
4. (Optional) App nickname: `LapSphere Android`
5. Click **"Register App"**

#### Step 1.3: Download google-services.json
1. Firebase will show: **Download google-services.json**
2. Click the download button
3. **Place the file in your frontend-expo root directory** (alongside package.json)
   ```
   frontend-expo/
   ├── package.json
   ├── app.json
   ├── google-services.json    ← Put it here
   ├── eas.json
   └── ...
   ```
4. If you already have `google-services[old].json`, delete or back it up

#### Step 1.4: Get Service Account Key (for Backend Push Notifications)
1. In Firebase Console, click **⚙️ Settings** (top right)
2. Go to **"Project Settings"** tab
3. Click **"Service Accounts"** tab
4. Click **"Generate New Private Key"**
5. A JSON file will download: `[project-name]-firebase-adminsdk-[...].json`
6. **Put this file in your BACKEND directory** (alongside backend/package.json)
   ```
   backend/
   ├── package.json
   ├── server.js
   ├── firebase-adminsdk-[...].json    ← Put it here
   └── ...
   ```
7. **Update backend/.env**:
   ```bash
   FCM_SERVICE_ACCOUNT_PATH=firebase-adminsdk-[...].json
   ```

---

### PART 2: Google Cloud Console Setup

#### Step 2.1: Enable FCM API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (dropdown at top)
3. Search for **"Firebase Cloud Messaging API"**
4. Click on it → Click **"Enable"**
5. Wait a few seconds for it to enable

#### Step 2.2: Create OAuth Client (for frontend)
1. In Google Cloud, go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth Client ID"**
3. If prompted, create an **OAuth Consent Screen** first:
   - User type: **External**
   - Fill in App Name: `LapSphere`
   - Add your email as tester
   - Scopes: `openid`, `email`, `profile` (minimal)
   - Save & Continue
4. Back to "Create Credentials" → **OAuth Client ID**
5. Application type: **Android**
6. Package name: `com.peakplay.itcp239.dev`
7. (Get SHA-1 certificate fingerprint - see Step 2.3)
8. Click **"Create"**

#### Step 2.3: Get SHA-1 Certificate Fingerprint (for Google OAuth)
Run in your frontend-expo directory:

**Windows (PowerShell)**:
```powershell
cd C:\Users\kuron\.android
ls
# Find debug.keystore (usually in ~/.android/debug.keystore)
```

Or generate one:
```powershell
keytool -genkey -v -keystore debug.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias androiddebugkey -storepass android -keypass android -dname "CN=,OU=,O=,L=,S=,C="
```

Get SHA-1:
```powershell
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA-1** value from output and paste in Google Cloud credentials.

---

### PART 3: EAS Credentials Setup

#### Step 3.1: Install EAS CLI (if not already installed)
```powershell
npm install -g eas-cli
```

#### Step 3.2: Login to Expo Account
```powershell
cd C:\Users\kuron\Downloads\itcp239\frontend-expo
eas login
```
- Enter your Expo account email
- Enter password
- You should see: ✅ Logged in

#### Step 3.3: Configure EAS Credentials
```powershell
eas credentials
```

You'll be prompted:
```
? Platform to setup, ios or android? 
→ android
```

Then:
```
? What would you like to do?
→ Set up new Android credentials
```

Choose distribution type:
```
? Select "production" for Play Store releases (or "preview" for internal testing)
→ production
```

#### Step 3.4: Configure Google Service Account for Push Notifications
After previous steps, you'll see:
```
? Set up Google Service Account for FCM / Push Notifications?
→ Yes
```

Then:
```
? Do you have a Google Service Account JSON file?
→ Yes
```

Paste the **entire contents** of your Firebase service account JSON file (the one you downloaded in Step 1.4):
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  ... (entire file)
}
```

Or if prompted for file path:
```
? Path to google service account file:
→ C:\Users\kuron\Downloads\itcp239\backend\firebase-adminsdk-[...].json
```

#### Step 3.5: Upload Keystore
If prompted for Android keystore:
```
? Do you have an existing Android keystore?
→ No (generates new one)
```
- EAS will generate and secure store a keystore for you
- Keep it safe (stored in EAS servers)

#### Step 3.6: Verify Setup Complete
After all prompts, you should see:
```
✅ Credentials configured successfully for production builds
```

---

### PART 4: Update Your Configuration Files

#### Step 4.1: Verify app.json (already correct)
Your app.json should have:
```json
{
  "expo": {
    ...
    "android": {
      "package": "com.peakplay.itcp239.dev",
      "googleServicesFile": "./google-services.json",
      ...
    },
    ...
  }
}
```

#### Step 4.2: Verify eas.json
Your eas.json should now include:
```json
{
  "cli": {
    "version": ">= 18.0.3",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "credentialsSource": "local"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### Step 4.3: Backend .env Configuration
Create/Update `backend/.env`:
```bash
CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/ITCP_database
JWT_SECRET=your-very-long-random-secret-key-here
FCM_SERVICE_ACCOUNT_PATH=firebase-adminsdk-[...].json
GOOGLE_CLIENT_IDS=YOUR_GOOGLE_CLIENT_ID_FROM_CONSOLE
PORT=4000
DB_NAME=ITCP_database
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

---

## Summary of Files to Create/Update

### ✅ Frontend-Expo Files
| File | Action | Where | What |
|------|--------|-------|------|
| `google-services.json` | Download from Firebase | `frontend-expo/` | Android Firebase config |
| `app.json` | Already configured | `frontend-expo/` | Package name is correct ✅ |
| `eas.json` | Verify after `eas credentials` | `frontend-expo/` | Credentials auto-configured |

### ✅ Backend Files
| File | Action | Where | What |
|------|--------|-------|------|
| `firebase-adminsdk-[...].json` | Download from Firebase | `backend/` | Service account private key |
| `.env` | Create/Update | `backend/` | Add FCM_SERVICE_ACCOUNT_PATH |
| `.gitignore` | Verify | `backend/` | Should exclude *.json & .env |

---

## Testing Push Notifications

### After Setup Complete, Test On Backend:

1. Start backend:
```powershell
cd backend
npm install  # if needed
npm start    # or npm run dev
```

2. Check logs for Firebase initialization:
```
[firebase] Initialized Firebase Admin SDK successfully
```

3. Send test push (via API):
```bash
POST /api/v1/promos/broadcast
Headers: Authorization: Bearer <JWT_TOKEN_OF_ADMIN>
Body: { "title": "Test Promo", "body": "Hello from Firebase!" }
```

### On Frontend (Expo):

1. Start Expo:
```powershell
cd frontend-expo
npm start
```

2. Scan QR code with Expo Go app
3. Login with test account
4. Admin sends promo broadcast
5. **Should see push notification pop up** 🔔

---

## Troubleshooting

### ❌ "google-services.json not found"
- Ensure file is in `frontend-expo/` root (not in subdirectory)
- File name must be **exactly**: `google-services.json`

### ❌ "Firebase credentials not configured"
- Run `eas credentials` again
- Select `production` → `google service account`
- Ensure you pasted entire Firebase service account JSON

### ❌ "FCM initialization failed"
- Check backend `.env` has correct `FCM_SERVICE_ACCOUNT_PATH`
- Verify service account JSON file exists and is readable
- Check file syntax (valid JSON)

### ❌ Push notifications not received on Expo Go
- Expo Go may not support FCM on all devices
- For testing: Use Expo's native push API instead (simpler)
- For production: Need to build APK with `eas build --platform android`

### ❌ "Package name mismatch"
- Ensure `com.peakplay.itcp239.dev` matches everywhere:
  - app.json: ✅ Already correct
  - Firebase: Must match when registering app
  - Google Cloud: Must match when creating OAuth client

---

## Next Steps

1. ✅ Complete PART 1-4 above
2. ✅ Test backend Firebase initialization
3. ✅ Build Expo development client (or use Expo Go)
4. ✅ Send test promo → verify push received
5. ✅ When ready for production: Run `eas build --platform android`

---

## Useful Links

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [EAS CLI Documentation](https://docs.expo.dev/build/introduction/)
- [FCM Setup for Expo](https://docs.expo.dev/push-notifications/setup/)

