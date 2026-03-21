# LapSphere Setup - Quick Action Checklist

## ✅ Pre-Work: Save Your Old Friend's Config (Optional)

Before changing anything, back up the PeakPlay files:
```powershell
# Create backup folder
mkdir backup_peakplay_config

# Copy friend's files there
cp firebase-adminsdk-peakplay.json backup_peakplay_config/
cp google-services.json backup_peakplay_config/
cp backend\.env backup_peakplay_config/
```

(This way if you need to reference anything, you have it)

---

## 📋 STEP-BY-STEP CHECKLIST

### ✅ SERVICE 1: MongoDB Atlas

**Time**: 10 minutes

- [ ] Go to https://www.mongodb.com/cloud/atlas
- [ ] Click "Sign Up" (create NEW account, not friend's)
- [ ] Verify email
- [ ] Create Cluster: Name it `lapsphere-cluster`
- [ ] Create Database User: Username `lapsphere_user` + password
- [ ] Add IP Address: Allow `0.0.0.0/0`
- [ ] Get Connection String (copy & save)
- [ ] Save format: `mongodb+srv://lapsphere_user:PASSWORD@lapsphere-cluster...`

**After completing:**
```
CONNECTION_STRING = [your MongoDB URL]
DB_USER = lapsphere_user
DB_PASSWORD = [your password]
```

---

### ✅ SERVICE 2: Expo Account

**Time**: 5 minutes

- [ ] Go to https://expo.dev/signup
- [ ] Create account with YOUR email (not friend's)
- [ ] Use username like `yourname_lapsphere`
- [ ] Verify email
- [ ] Login locally:
  ```powershell
  eas login
  # Enter email & password
  ```
- [ ] Create Organization (optional): `lapsphere-org`

**After completing:**
```
EXPO_USERNAME = [your username]
EXPO_PASSWORD = [saved]
```

---

### ✅ SERVICE 3: Firebase Project

**Time**: 15 minutes

- [ ] Go to https://console.firebase.google.com/
- [ ] Create NEW project: `lapsphere-ecommerce`
  - **NOT** friend's PeakPlay project!
- [ ] Add Android App
  - Package Name: `com.lapsphere.itcp239` (IMPORTANT!)
  - App nickname: `LapSphere Android`
- [ ] Download `google-services.json`
  - **Save to**: `frontend-expo/google-services.json`
- [ ] Get Service Account Key
  - Settings → Project Settings → Service Accounts → Generate Key
  - **Save to**: `backend/firebase-adminsdk-lapsphere.json`
- [ ] Enable Cloud Messaging (if not auto-enabled)
- [ ] Get Server API Key (optional)
  - Settings → Cloud Messaging tab

**After completing:**
```
FIREBASE_PROJECT_ID = lapsphere-ecommerce
GOOGLE_SERVICES_JSON = frontend-expo/google-services.json ✓
FIREBASE_SERVICE_ACCOUNT = backend/firebase-adminsdk-lapsphere.json ✓
SERVER_API_KEY = [from Cloud Messaging tab]
```

---

### ✅ SERVICE 4: Google Cloud

**Time**: 10 minutes

- [ ] Go to https://console.cloud.google.com/
- [ ] Select/Create project: `lapsphere-cloud`
  - (Or use auto-created Firebase project)
- [ ] Enable APIs:
  - Search: "Firebase Cloud Messaging API" → Enable
  - Search: "Google+ API" → Enable
- [ ] Create OAuth Consent Screen:
  - User Type: External
  - App Name: `LapSphere`
  - Add yourself as Test User
- [ ] Create OAuth Client ID:
  - Type: Android
  - Package Name: `com.lapsphere.itcp239`
  - SHA-1 Fingerprint: [Get from step below]
- [ ] Get SHA-1 Fingerprint:
  ```powershell
  cd C:\Users\kuron\.android
  keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
  # Copy SHA-1 value
  ```

**After completing:**
```
GOOGLE_CLOUD_PROJECT = lapsphere-cloud
GOOGLE_CLIENT_ID = [from OAuth Client]
GOOGLE_SHA1_FINGERPRINT = [from keytool]
```

---

## 🔧 UPDATE YOUR APP CONFIG FILES

### Step 1: Update `app.json`

Open: `frontend-expo/app.json`

Replace entire file with:
```json
{
  "expo": {
    "name": "lapsphere",
    "slug": "lapsphere",
    "scheme": [
      "com.lapsphere.itcp239.dev",
      "com.googleusercontent.apps.YOUR_GOOGLE_CLIENT_ID"
    ],
    "owner": "YOUR_EXPO_USERNAME",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "package": "com.lapsphere.itcp329",
      "googleServicesFile": "./google-services.json",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    },
    "plugins": [
      "expo-sqlite",
      "expo-secure-store",
      "expo-web-browser"
    ]
  }
}
```

**Fill in:**
- `scheme`: Replace `YOUR_GOOGLE_CLIENT_ID` with your Google OAuth client ID
- `owner`: Your Expo username (from Expo signup)
- `extra.eas.projectId`: Get from Expo dashboard → Project Settings

---

### Step 2: Create `backend/.env`

Create NEW file: `backend/.env`

Copy this and fill in YOUR credentials:
```bash
# MongoDB
CONNECTION_STRING=mongodb+srv://lapsphere_user:YOUR_PASSWORD@lapsphere-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=lapsphere_db
JWT_SECRET=lapsphere_secret_key_make_this_very_long_12345!@#$%

# Firebase / FCM
FCM_SERVICE_ACCOUNT_PATH=firebase-adminsdk-lapsphere.json
FCM_SERVER_API_KEY=YOUR_SERVER_API_KEY_FROM_FIREBASE

# Server
PORT=4000
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*

# Google OAuth (Optional)
GOOGLE_CLIENT_IDS=YOUR_GOOGLE_CLIENT_ID
```

**Requirements:**
- CONNECTION_STRING: From MongoDB Atlas (Step 1)
- FCM_SERVICE_ACCOUNT_PATH: Filename of your Firebase service account (Step 3)
- GOOGLE_CLIENT_IDS: From Google Cloud console (Step 4)

---

### Step 3: Create `frontend-expo/.env` (Optional)

Create file: `frontend-expo/.env`

```bash
EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:4000/api/v1
EXPO_PUBLIC_FIREBASE_PROJECT_ID=lapsphere-ecommerce
```

(Replace YOUR_LAPTOP_IP with your actual IP—get from `ipconfig` command)

---

### Step 4: Verify `.gitignore` Files

Make sure these files are NOT tracked in Git:

**`backend/.gitignore`** should include:
```
.env
.env.local
.env.*.local
*.json
!package.json
!eas.json
node_modules/
uploads/
```

**`frontend-expo/.gitignore`** should include:
```
.env
.env.local
.env.*.local
google-services.json
google-services[old].json
node_modules/
.expo/
dist/
```

---

## 🚀 FINAL STEP: Configure EAS Credentials

After ALL services above are created, run:

```powershell
cd C:\Users\kuron\Downloads\itcp239\frontend-expo

# Login (if not already)
eas login

# Configure EAS credentials (Professor's instruction)
eas credentials
```

Follow prompts:
```
? Platform to setup: → Select android
? What would you like to do: → Set up new Android credentials
? Distribution: → Select production
? Do you have a Google Service Account JSON file? → Yes
? Paste the entire contents of your JSON file:
  → [Paste entire content of backend/firebase-adminsdk-lapsphere.json]
```

Or if using CLI:
```powershell
eas build:configure
# Then run eas credentials again
```

✅ You should see: "✓ Credentials configured successfully"

---

## ✅ VERIFICATION: Check Everything

### Check Your Files Exist:
```powershell
# Check frontend-expo
cd frontend-expo
ls google-services.json     # Should exist ✓
ls eas.json                 # Should exist ✓

# Check backend
cd ..\backend
ls firebase-adminsdk-lapsphere.json   # Should exist ✓
cat .env                               # Should show your credentials
```

### Check MongoDB Connection:
```powershell
cd backend
npm install   # If needed
npm start     # Should connect to MongoDB

# Look for output:
# [database] Connected to lapsphere_db successfully
```

### Check Expo Login:
```powershell
eas whoami
# Should show: [YOUR_EXPO_USERNAME]
```

### Check Credentials:
```powershell
eas credentials
# Should show: ✓ Android credentials configured
```

---

## 📝 SUMMARY: What You Did

You've successfully:
1. ✅ Created your own MongoDB database (lapsphere_db)
2. ✅ Created your own Firebase project (lapsphere-ecommerce)
3. ✅ Created your own Expo account 
4. ✅ Created your own Google Cloud project
5. ✅ Updated app configurations
6. ✅ Created backend/.env with YOUR credentials (not friend's!)
7. ✅ Configured EAS for building

**Now you're independent from your friend's PeakPlay system** 🎉

---

## 🔥 Next: Start Developing

```powershell
# Terminal 1: Start Backend
cd backend
npm install
npm start

# Terminal 2: Start Frontend
cd frontend-expo
npm install
npm start

# Scan QR code with Expo Go on your phone
```

You should now be able to test your LapSphere app with YOUR own services!

