# LapSphere Fresh Setup Guide - All Services

**Goal**: Migrate from PeakPlay (friend's) to LapSphere (yours)

## Overview of Services to Set Up

| Service | Account Type | Purpose | Link |
|---------|---|---|---|
| **MongoDB Atlas** | Cloud Database | Store users, products, orders, reviews | [mongodb.com](https://mongodb.com) |
| **Firebase** | Backend Services | Push notifications, storage | [firebase.google.com](https://firebase.google.com) |
| **Expo (EAS)** | Build Service | Build Android APK, manage credentials | [expo.dev](https://expo.dev) |
| **Google Cloud** | Cloud Platform | OAuth, FCM, APIs | [console.cloud.google.com](https://console.cloud.google.com) |

---

# ACCOUNT 1: MongoDB Atlas (Database)

## Step 1.1: Create MongoDB Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Sign Up"** or **"Get Started Free"**
3. Fill in:
   - Email: Your email
   - Password: Strong password
   - First/Last Name: Your name
   - Accept terms → **"Create Account"**
4. Check email for verification link → Verify
5. You're now in MongoDB Atlas dashboard ✅

---

## Step 1.2: Create Your First Cluster

1. Click **"+ Create"** → **"Build a Cluster"**
2. Select **"Shared"** tier (FREE - ✅ for development)
3. Choose:
   - **Cloud Provider**: AWS / Google Cloud / Azure (pick closest to you)
   - **Region**: Keep default or select your region
4. **Cluster Name**: `lapsphere-cluster` (IMPORTANT: Change from peakplay!)
5. Click **"Create Cluster"**
6. Wait 2-3 minutes for cluster creation

---

## Step 1.3: Create Database User (Username/Password)

1. In cluster view, click **"Security"** → **"Database Access"**
2. Click **"+ Add Database User"**
3. Fill in:
   - **Username**: `lapsphere_user` (IMPORTANT: Different from peakplay_user!)
   - **Password**: Generate secure password (save this!)
     - Save format: `lapsphere_user:yourPassword123!@`
   - **Database User Privileges**: Select **"Built-in Role"** → **"Atlas Admin"**
4. Click **"Add User"** ✅

---

## Step 1.4: Configure Network Access

1. Click **"Security"** → **"Network Access"**
2. Click **"+ Add IP Address"**
3. Select **"Allow Access from Anywhere"** (for development only! Use `0.0.0.0/0`)
4. Confirm → **"Confirm"** ✅

---

## Step 1.5: Get Connection String

1. Go to **"Clusters"** (left sidebar)
2. Click **"Connect"** button on your cluster
3. Select **"Drivers"** (Node.js)
4. Select **Node.js version 4.0+** → Copy connection string
5. Format will be:
   ```
   mongodb+srv://lapsphere_user:yourPassword123!@lapsphere-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

**SAVE THIS!** You'll need it for `backend/.env`

---

## Step 1.6: Update Backend Configuration

You'll create `backend/.env` later with:
```bash
CONNECTION_STRING=mongodb+srv://lapsphere_user:yourPassword123!@lapsphere-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=lapsphere_db
```

---

# ACCOUNT 2: Expo (EAS) Account

## Step 2.1: Create Expo Account

1. Go to [Expo Sign Up](https://expo.dev/signup)
2. Fill in:
   - Email: Your email
   - Password: Strong password
   - Username: `yourname_lapsphere` (IMPORTANT: Not your friend's PeakPlay account!)
3. Click **"Continue with Email"**
4. Verify email
5. You're in your Expo dashboard ✅

---

## Step 2.2: Create Organization (Optional but Recommended)

1. Click your avatar (top right) → **"Account Settings"**
2. Go to **"Organizations"** → **"Create Organization"**
3. Name: `lapsphere-org` (or your name)
4. Click **"Create"**
5. Note your **Organization Slug** (you'll see it like `lapsphere-org`)

---

## Step 2.3: Login Locally (on Your Computer)

```powershell
# In PowerShell, anywhere:
eas login

# Prompts:
# Email: [your expo email]
# Password: [your password]
# Should show: "✓ Logged in as: yourname_lapsphere"
```

✅ You should see confirmation

---

# ACCOUNT 3: Firebase Project

## Step 3.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or **"Add project"**
3. Project name: `lapsphere-ecommerce` (IMPORTANT: Not peakplay!)
4. Click **"Continue"**
5. Analytics: You can disable for now
6. Click **"Create project"**
7. Wait for project creation (30 seconds)
8. Click **"Continue"** → You're in Firebase dashboard ✅

---

## Step 3.2: Register Android App

1. In Firebase dashboard, click **"Add App"** (+ icon next to Project Overview)
2. Select **Android** icon
3. Fill in **Android Package Name**: `com.lapsphere.itcp239` (IMPORTANT: Different from com.peakplay!)
4. (Optional) App nickname: `LapSphere Android`
5. (Optional) Debug signing certificate SHA-1: (can skip for now)
6. Click **"Register App"**
7. ✅ App registered in Firebase

---

## Step 3.3: Download google-services.json

1. After registering app, Firebase shows: **"Download google-services.json"**
2. Click **Download** button
3. Put the file in: **`frontend-expo/google-services.json`**
   ```
   frontend-expo/
   ├── package.json
   ├── app.json
   ├── google-services.json    ← HERE
   └── eas.json
   ```
4. ✅ File saved

---

## Step 3.4: Download Service Account Key (for Backend)

1. In Firebase, click ⚙️ **Settings** (top right)
2. Go to **"Project Settings"**
3. Click **"Service Accounts"** tab
4. Click **"Generate New Private Key"**
5. Download JSON file (name like: `lapsphere-ecommerce-firebase-adminsdk-xxxxx.json`)
6. Put in: **`backend/firebase-adminsdk-lapsphere.json`**
   ```
   backend/
   ├── package.json
   ├── server.js
   ├── firebase-adminsdk-lapsphere.json    ← HERE
   └── .env
   ```
7. ✅ Service account key saved

---

## Step 3.5: Enable Firebase Cloud Messaging (FCM)

1. In Firebase console, click **"Messaging"** (left sidebar under "Engage")
2. You might see: **"Firebase Cloud Messaging API"** needs enabling
3. Click **"Enable"** if prompted
4. ✅ FCM is enabled

---

## Step 3.6: Get Server API Key (Optional—for backend)

1. In Firebase, go to **Settings** → **Project Settings**
2. Click **"Cloud Messaging"** tab
3. Copy **"Server API Key"** (looks like: `AAAAJ5xxxxxx`)
4. Save in `backend/.env` as:
   ```bash
   FCM_SERVER_API_KEY=AAAAJ5xxxxxx
   ```

---

# ACCOUNT 4: Google Cloud Console

## Step 4.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. If first time, you may need to accept terms
3. Click **Project Selector** (top, next to "Google Cloud")
4. Click **"New Project"**
5. Project name: `lapsphere-cloud` (IMPORTANT: Different from peakplay!)
6. Organization: Leave blank or select yours
7. Click **"Create"**
8. Wait for project creation → You're in Google Cloud dashboard ✅

---

## Step 4.2: Link Google Cloud to Firebase (Optional—Automatic)

Actually, when you create a Firebase project, Google Cloud project is **automatically created**. You just need to ensure they're linked:

1. In [Google Cloud Console](https://console.cloud.google.com/), click **Project Selector**
2. You should see: `lapsphere-ecommerce` (auto-created by Firebase)
3. Click to select it ✅

---

## Step 4.3: Enable Required APIs

### Enable Firebase Cloud Messaging API
1. Search for **"Firebase Cloud Messaging API"**
2. Click on it → Click **"Enable"**
3. Wait for enablement ✅

### Enable Google Sign-In (for Google OAuth)
1. Search for **"Google+ API"** or **"Identity and Access Management API"**
2. Click → Click **"Enable"**
3. ✅

---

## Step 4.4: Create OAuth 2.0 Client (for Google Sign-In)

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth Client ID"**
3. If prompted: Create **OAuth Consent Screen** first:
   - User Type: **External** (for testing)
   - App Name: `LapSphere`
   - User Support Email: Your email
   - Scopes: Add `openid`, `email`, `profile`
   - Test Users: Add your email
   - Save & Continue ✅
4. Back to "Create Credentials" → **OAuth Client ID**
5. Application Type: **Android**
6. Package Name: `com.lapsphere.itcp239` (MUST MATCH app.json!)
7. SHA-1 Certificate Fingerprint: Get from Step 4.5
8. Click **"Create"** → Save Client ID
9. ✅ OAuth client created

---

## Step 4.5: Get SHA-1 Certificate Fingerprint (for Google OAuth)

**For Development (using debug keystore)**:

```powershell
# Windows PowerShell
cd C:\Users\kuron\.android

# List files
ls

# If debug.keystore exists, get SHA-1:
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android

# Look for: "Certificate fingerprints" → SHA-1 value
```

**If debug.keystore doesn't exist**:
```powershell
keytool -genkey -v -keystore debug.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias androiddebugkey -storepass android -keypass android -dname "CN=,OU=,O=,L=,S=,C="
```

Copy the **SHA-1** value and paste in Google Cloud OAuth credentials (Step 4.4)

---

# CONFIGURATION: Update Your LapSphere App

## File 1: app.json (Package Name Change)

Update `frontend-expo/app.json`:

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
    ...
    "android": {
      "package": "com.lapsphere.itcp239",
      "googleServicesFile": "./google-services.json",
      ...
    },
    ...
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

**CHANGES**:
- `name`: `lapsphere`
- `slug`: `lapsphere`
- `owner`: Your Expo username
- `android.package`: `com.lapsphere.itcp239`
- `extra.eas.projectId`: Get from Expo dashboard → Project settings

---

## File 2: eas.json (Create/Update)

Create or update `frontend-expo/eas.json`:

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

---

## File 3: backend/.env (Create New)

Create `backend/.env` with **LapSphere credentials** (NEVER commit this file!):

```bash
# MongoDB
CONNECTION_STRING=mongodb+srv://lapsphere_user:yourPassword123!@lapsphere-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=lapsphere_db
JWT_SECRET=lapsphere_jwt_secret_key_make_this_very_long_and_random_12345!@#$%

# Firebase / FCM
FCM_SERVICE_ACCOUNT_PATH=firebase-adminsdk-lapsphere.json
FCM_SERVER_API_KEY=AAAAJ5xxxxxx

# Server
PORT=4000
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*

# Google OAuth
GOOGLE_CLIENT_IDS=YOUR_GOOGLE_CLIENT_ID_FROM_GOOGLE_CLOUD
```

---

## File 4: frontend-expo/.env (If using one)

Create `frontend-expo/.env` (optional, for runtime config):

```bash
EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:4000/api/v1
EXPO_PUBLIC_FIREBASE_PROJECT_ID=lapsphere-ecommerce
```

---

## File 5: .gitignore (Both frontend & backend)

Ensure `.gitignore` excludes sensitive files:

**backend/.gitignore**:
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

**frontend-expo/.gitignore**:
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

# HOW TO GET EAS PROJECT ID

1. Go to [Expo Dashboard](https://expo.dev/home)
2. Click your project: `lapsphere`
3. Click **"Settings"** (gear icon)
4. Under **"Project ID"**, copy the value (looks like: `6f747b51-b33e-4c6e-9d11-89bf760ec81a`)
5. Put in `app.json` under `extra.eas.projectId`

---

# EAS CREDENTIALS SETUP (Using Prof's Instructions)

Once you have all accounts created, follow these steps:

## Step 1: Login to Expo
```powershell
cd C:\Users\kuron\Downloads\itcp239\frontend-expo
eas login
```

## Step 2: Configure Credentials
```powershell
eas credentials
```

Follow prompts:
```
? Platform: android
? What would you like to do? → Set up new Android credentials
? Distribution: production
? Do you have a Google Service Account JSON file? → Yes
? Paste the contents of your Google Service Account JSON:
[Paste entire content of firebase-adminsdk-lapsphere.json]

✓ Credentials configured successfully
```

## Step 3: Generate EAS Config (if missing)
```powershell
eas build:configure
```

Then run `eas credentials` again to finalize.

---

# SUMMARY: What Changed from PeakPlay → LapSphere

| Component | PeakPlay | LapSphere (Yours) | Where |
|---|---|---|---|
| Package Name | `com.peakplay.itcp239.dev` | `com.lapsphere.itcp239` | app.json |
| Firebase Project | peakplay-xxx | `lapsphere-ecommerce` | Firebase console |
| Google Cloud Project | peakplay-cloud | `lapsphere-cloud` | Google Cloud console |
| MongoDB Cluster | peakplay-cluster | `lapsphere-cluster` | MongoDB Atlas |
| MongoDB User | peakplay_user | `lapsphere_user` | MongoDB Atlas |
| EAS Account | Friend's account | Your Expo account | Expo dashboard |
| Service Account JSON | firebase-adminsdk-peakplay.json | `firebase-adminsdk-lapsphere.json` | backend/ |
| google-services.json | Friend's PeakPlay config | `google-services.json` (new) | frontend-expo/ |
| Database Name | peakplay_db | `lapsphere_db` | MongoDB |
| .env USERNAME | peakplay_user | `lapsphere_user` | backend/.env |

---

# SECURITY: IMPORTANT!

**BEFORE YOU PUSH TO GIT**:

- [ ] `.env` is in `.gitignore` (never commit)
- [ ] `firebase-adminsdk-lapsphere.json` in `.gitignore` (never commit)
- [ ] `google-services.json` in `.gitignore` (never commit old files)
- [ ] No API keys in JavaScript files (keep in `.env`)
- [ ] All credentials are YOUR credentials, not friend's

**TO VERIFY**:
```powershell
git status
# Should NOT show:
#   .env
#   *.json (except package.json, app.json, eas.json)
```

If they show, add to `.gitignore` and run:
```powershell
git rm --cached .env
git rm --cached firebase-adminsdk-lapsphere.json
git commit -m "Remove sensitive files"
```

---

# NEXT STEPS (Order)

1. ✅ Create MongoDB account → Get CONNECTION_STRING
2. ✅ Create Expo account → Login with eas login
3. ✅ Create Firebase project → Download google-services.json & service account key
4. ✅ Create Google Cloud project → Get OAuth Client ID & enable APIs
5. ✅ Update app.json with new package name & EAS project ID
6. ✅ Create backend/.env with all credentials
7. ✅ Create frontend-expo/.env (optional)
8. ✅ Run eas credentials (professor's instruction)
9. ✅ Test: npm start (backend) and expo start (frontend)

