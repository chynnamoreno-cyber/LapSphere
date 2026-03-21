# File Structure & What to Update

## Current State (From PeakPlay)

```
itcp239/
├── backend/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   ├── firebase-adminsdk-peakplay.json    ← FRIEND'S FILE (DELETE)
│   └── .env (if exists)                   ← FRIEND'S CREDS (REPLACE)
│
└── frontend-expo/
    ├── app.json                           ← UPDATE package name
    ├── eas.json
    ├── google-services.json               ← FRIEND'S FILE (REPLACE)
    ├── google-services[old].json          ← DELETE
    ├── package.json
    └── .gitignore
```

---

## Target State (LapSphere - Yours)

```
itcp239/
├── backend/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   ├── firebase-adminsdk-lapsphere.json   ← YOUR FILE (DOWNLOAD)
│   ├── .env                               ← YOUR CREDENTIALS (CREATE)
│   └── .gitignore
│
└── frontend-expo/
    ├── app.json                           ← UPDATED with YOUR package
    ├── eas.json
    ├── google-services.json               ← YOUR FILE (DOWNLOAD)
    ├── package.json
    └── .gitignore
```

---

## Detailed File Changes

### FILE 1: `frontend-expo/app.json`

**OLD (PeakPlay)**:
```json
{
  "expo": {
    "name": "frontend-expo",
    "slug": "frontend-expo",
    "owner": "edilynplay",
    "android": {
      "package": "com.peakplay.itcp239.dev"
    }
  }
}
```

**NEW (LapSphere)**:
```json
{
  "expo": {
    "name": "lapsphere",
    "slug": "lapsphere",
    "owner": "YOUR_EXPO_USERNAME",
    "android": {
      "package": "com.lapsphere.itcp239"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

---

### FILE 2: `backend/.env`

**OLD (PeakPlay)** - Don't touch!

**NEW (LapSphere)** - CREATE THIS:
```bash
# MongoDB (Your Database)
CONNECTION_STRING=mongodb+srv://lapsphere_user:YOUR_PASSWORD@lapsphere-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=lapsphere_db

# JWT
JWT_SECRET=lapsphere_secret_key_change_me_12345!@#$%

# Firebase (Your Project)
FCM_SERVICE_ACCOUNT_PATH=firebase-adminsdk-lapsphere.json

# Server Config
PORT=4000
CORS_ORIGIN=*
```

---

### FILE 3: `backend/firebase-adminsdk-lapsphere.json`

**OLD**: `firebase-adminsdk-peakplay.json` (Friend's file - can delete)

**NEW**: `firebase-adminsdk-lapsphere.json` (YOUR file - download from Firebase)

---

### FILE 4: `frontend-expo/google-services.json`

**OLD**: `google-services.json` (Friend's file - can replace)
**OLD**: `google-services[old].json` (Can delete)

**NEW**: `google-services.json` (YOUR file - download from Firebase)

---

### FILE 5: `.gitignore` Files

**`backend/.gitignore`**:
```
.env
.env.local
*.json
!package.json
!eas.json
node_modules/
uploads/
```

**`frontend-expo/.gitignore`**:
```
.env
.env.local
google-services.json
google-services[old].json
node_modules/
.expo/
```

---

## Deletion Checklist

Before you update, you can safely delete friend's old config files:

```powershell
# In backend/
rm firebase-adminsdk-peakplay.json

# In frontend-expo/
rm google-services[old].json

# They should be backed up in backup_peakplay_config/ if you made backup
```

---

## Commands to Set It Up Step-by-Step

### 1️⃣ Delete Old Friend's Files
```powershell
cd C:\Users\kuron\Downloads\itcp239\backend
rm firebase-adminsdk-peakplay.json    # Delete old file

cd C:\Users\kuron\Downloads\itcp239\frontend-expo
rm google-services[old].json          # Delete old file
```

### 2️⃣ Create Backend .env
```powershell
cd C:\Users\kuron\Downloads\itcp239\backend

# Create .env with your credentials
# Using Notepad++ or VS Code:
#   - File → New
#   - Paste content from guide above
#   - Replace YOUR_PASSWORD, YOUR_DATABASE_URL, etc.
#   - Save as: .env
```

Or using PowerShell:
```powershell
$env_content = @"
CONNECTION_STRING=mongodb+srv://lapsphere_user:YOUR_PASSWORD@lapsphere-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=lapsphere_db
JWT_SECRET=lapsphere_secret_key_12345!@#

FCM_SERVICE_ACCOUNT_PATH=firebase-adminsdk-lapsphere.json

PORT=4000
CORS_ORIGIN=*
"@

$env_content | Out-File -FilePath ".\.env" -Encoding UTF8
```

### 3️⃣ Download Firebase Files

After creating Firebase project:

```powershell
# Download google-services.json from Firebase
# Place in: frontend-expo/google-services.json

# Download firebase-adminsdk-lapsphere.json from Firebase
# Place in: backend/firebase-adminsdk-lapsphere.json
```

### 4️⃣ Update app.json
```powershell
cd C:\Users\kuron\Downloads\itcp239\frontend-expo

# Edit app.json:
# Replace "owner": "edilynplay" → "owner": "YOUR_EXPO_USERNAME"
# Replace "package": "com.peakplay.itcp239.dev" → "package": "com.lapsphere.itcp239"
# Add "projectId" under extra.eas
```

### 5️⃣ Login & Configure EAS
```powershell
cd C:\Users\kuron\Downloads\itcp239\frontend-expo

# Login to your Expo account
eas login

# Configure credentials
eas credentials
```

### 6️⃣ Verify Setup
```powershell
# Test backend connection
cd backend
npm start

# In another terminal, test frontend
cd frontend-expo
npm start
```

---

## File Size Reference (So You Know What to Expect)

| File | Size | Notes |
|------|------|-------|
| `google-services.json` | ~3 KB | Android Firebase config |
| `firebase-adminsdk-*.json` | ~2 KB | Firebase service account (SENSITIVE!) |
| `app.json` | ~1 KB | App configuration |
| `eas.json` | ~0.5 KB | EAS build configuration |
| `.env` | ~1 KB | Backend secrets (NOT IN GIT!) |

---

## Git Status After Setup (What Should Show)

When you run:
```powershell
git status
```

You should see:
```
On branch main

Changes not staged for commit:
  modified:   frontend-expo/app.json
  modified:   frontend-expo/eas.json
  deleted:    backend/firebase-adminsdk-peakplay.json
  deleted:    frontend-expo/google-services[old].json

Untracked files:
  frontend-expo/google-services.json        ← Should be in .gitignore (not shown)
  backend/.env                              ← Should be in .gitignore (not shown)
  backend/firebase-adminsdk-lapsphere.json  ← Should be in .gitignore (not shown)
```

🚨 **If .env or JSON files are showing, add them to .gitignore!**

