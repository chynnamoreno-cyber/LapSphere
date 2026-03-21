# Profile & Image Upload - Visual Architecture

## System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         REST API BACKEND (Node/Express)                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Express Routes: /users/*                                             │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │ │ POST /register           - Register + upload profile pic       │  │  │
│  │ │ POST /login              - Auth & return JWT                   │  │  │
│  │ │ GET  /:id                - Get profile (requires JWT)          │  │  │
│  │ │ PUT  /profile            - Update name, address, etc.          │  │  │
│  │ │ PUT  /profile/image      - Upload/update profile image         │  │  │
│  │ └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │ │ Middleware: authJwt                                             │  │  │
│  │ │ ├─ Verify JWT signature                                         │  │  │
│  │ │ ├─ Extract userId from decoded token                            │  │  │
│  │ │ └─ Attach to req.user                                           │  │  │
│  │ └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │ │ Multer File Upload Middleware                                   │  │  │
│  │ ├─ Limit: 50MB per file                                           │  │  │
│  │ ├─ Limit: 200MB text fields (for base64 JSON)                     │  │  │
│  │ ├─ Save to: /backend/uploads/                                     │  │  │
│  │ └─ Filename: {timestamp}-{original_name}.{ext}                    │  │  │
│  └──────────────────────────────────────────────────────────────────┘  │  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ MongoDB Storage                                                      │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ User Collection:                                                     │  │
│  │ ├─ _id: ObjectId                                                    │  │
│  │ ├─ email: string (unique)                                           │  │
│  │ ├─ passwordHash: bcrypt hash                                        │  │
│  │ ├─ name: string                                                     │  │
│  │ ├─ phone: string                                                    │  │
│  │ ├─ image: string (URL to uploaded image)     ← PROFILE PIC         │  │
│  │ ├─ deliveryAddress1: string                                         │  │
│  │ ├─ deliveryAddress2: string                                         │  │
│  │ ├─ deliveryCity: string                                             │  │
│  │ ├─ deliveryZip: string                                              │  │
│  │ ├─ deliveryCountry: string                                          │  │
│  │ ├─ deliveryLocation: { latitude, longitude }   ← MAP LOCATION      │  │
│  │ ├─ isAdmin: boolean                                                 │  │
│  │ └─ createdAt: timestamp                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
                                  ↕ (REST API)
                                  
┌────────────────────────────────────────────────────────────────────────────┐
│                  MOBILE/WEB FRONTEND (Expo React Native)                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Auth Flow                                                            │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  Login Input  → POST /users/login  → JWT Token  →  Secure Store    │  │
│  │                                        ↓                             │  │
│  │                                   Decode JWT                         │  │
│  │                                        ↓                             │  │
│  │                              AuthGlobal Context                      │  │
│  │                              (isAuthenticated, userId)               │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Screen: UserProfile.js                                              │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │ [On Screen Focus]                                                   │  │
│  │      ↓                                                               │  │
│  │ getJwtToken()  →  Secure Store / AsyncStorage  →  JWT String       │  │
│  │      ↓                                                               │  │
│  │ axios.get(/users/{userId}, headers: Bearer {jwt})                   │  │
│  │      ↓                                                               │  │
│  │ hydrateProfileForm(user_data)  →  Sets local state                  │  │
│  │                                                                       │  │
│  │ ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │ │ Local Component State:                                          │ │  │
│  │ │ ├─ name, phone (editable inputs)                               │ │  │
│  │ │ ├─ deliveryAddress1/2, city, zip, country                      │ │  │
│  │ │ ├─ deliveryLocation (lat/lng from map picker)                  │ │  │
│  │ │ ├─ profileImage (current server image URL)                     │ │  │
│  │ │ ├─ newProfileImage (selected: blob: or file:// URI)            │ │  │
│  │ │ ├─ newProfileImageBase64 (for web blob: → base64)              │ │  │
│  │ │ ├─ newProfileImageMime (image/jpeg, image/png)                 │ │  │
│  │ │ └─ isSaving (boolean - disable buttons while saving)           │ │  │
│  │ └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │ [User edits form + selects image]                                   │  │
│  │      ↓                                                               │  │
│  │ pickProfileFromGallery() / takeProfilePhoto()                       │  │
│  │      ├─ ImagePicker.launchImageLibraryAsync() orCameraAsync()       │  │
│  │      ├─ User selects/captures image                                 │  │
│  │      └─ Sets state: newProfileImage, base64, mime                   │  │
│  │      ↓                                                               │  │
│  │ Image displayed as preview (setProfileImage = uri)                  │  │
│  │                                                                       │  │
│  │ [User taps "Save Profile"]                                          │  │
│  │      ↓                                                               │  │
│  │ saveProfile() → uploadProfilePhoto() [if image set]                 │  │
│  │      │                                                               │  │
│  │      ├─ IF blob: URI → blobUriToBase64() → {data, mime}             │  │
│  │      │                                                               │  │
│  │      ├─ IF file:// URI → FormData.append(image, {uri, type, name})  │  │
│  │      │                                                               │  │
│  │      └─ axios.put(/users/profile/image, formData, Bearer {jwt})     │  │
│  │           ↓                                                           │  │
│  │           Clear new image state on success                           │  │
│  │      ↓                                                               │  │
│  │ axios.put(/users/profile, {name, phone, address...}, Bearer {jwt})  │  │
│  │      ↓                                                               │  │
│  │ hydrateProfileForm(updated_user_data)                               │  │
│  │      ↓                                                               │  │
│  │ Toast: "Profile updated successfully"                               │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Storage Configuration                                               │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │ JWT Storage:                                                         │  │
│  │ ├─ Mobile: Expo Secure Store (encrypted)                            │  │
│  │ └─ Web: localStorage / AsyncStorage fallback                        │  │
│  │                                                                       │  │
│  │ Profile Data: Local component state ONLY (no persistence)           │  │
│  │                                                                       │  │
│  │ Cart Data:                                                           │  │
│  │ ├─ Mobile: Redux + SQLite (primary) + AsyncStorage (fallback)      │  │
│  │ └─ Web: Redux + AsyncStorage                                        │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow Diagram

### Profile Image Upload - Dual Path

```
┌─────────────────────────────────┐
│   User selects/captures image   │
└──────────────────┬──────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    WEB                   MOBILE
    │                     │
    ▼                     ▼
blob: URI          file:// URI
    │                     │
    │                     └────→ Multipart FormData
    │                     │      ├─ Content-Type: multipart/form-data
    │                     │      ├─ image: {uri, type, name}
    │                     │      └─ Authorization: Bearer {jwt}
    │                     │
    ▼                     │
Can convert?              │ axios.put(/users/profile/image)
├─ Yes → JSONbase64       │      │
│   │      ├─ data        │      ▼
│   │      ├─ mime        │ [Backend: authJwt → Multer]
│   │      └─ Append to FormData
│   │      │              
│   │      └─ FormData.append("imageBase64",JSON.stringify{...})
│   │      │
│   └────→ axios.put(/users/profile/image)
│          │
│          ▼
│   Content-Type: multipart/form-data
│   imageBase64: "{\"data\":\"...\",\"mime\":\"image/jpeg\"}"
│   Authorization: Bearer {jwt}
│
└─ No → Error Toast
        └─ Continue profile save anyway (⚠️ problem!)
```

### Backend Processing

```
PUT /users/profile/image
    │
    ├─ Middleware: authJwt
    │   └─ Verify JWT → Extract userId
    │
    ├─ Middleware: multer (upload.single("image"))
    │   └─ If multipart file → Save to disk
    │
    ├─ req.file (multipart)?
    │   ├─ YES → buildImageUrl(req, req.file.filename)
    │   │        └─ Returns: http://host:port/uploads/1709123456-abc.jpg
    │   │
    │   └─ NO → Parse req.body.imageBase64 (JSON)
    │       ├─ Extract base64 string
    │       ├─ Detect MIME (png/jpg)
    │       ├─ Decode base64 → Buffer
    │       ├─ Write to disk: /uploads/{timestamp}-{random}.{ext}
    │       └─ buildImageUrl() → Returns URL
    │
    ├─ User.findByIdAndUpdate(userId, {image: url})
    │   └─ MongoDB update
    │
    └─ Return: Updated user object with new image URL
```

---

## Data Flow: Complete Save Process

```
MOBILE                          WEB
├─ file:// URI                  ├─ blob: URI
├─ Multipart form-data          ├─ JSON base64
├─ Direct file                  ├─ Converted to base64
└─ Faster, native               └─ More processing

Both paths merge at:
GET /users/profile/image → Receive updated user object

┌─────────────────────────────────────┐
│ Backend returns updated user:        │
├─────────────────────────────────────┤
│ {                                   │
│   "_id": "...",                     │
│   "email": "...",                   │
│   "image": "http://.../uploads/...  │ ← New URL
│   "name": "...",                    │
│   ... other fields                  │
│ }                                   │
└─────────────────────────────────────┘
         ↓
    Clear new image state
         ↓
    Call PUT /users/profile
    {name, phone, address...}
         ↓
    Backend updates remaining fields
         ↓
    Return updated user
         ↓
    hydrateProfileForm()
    ├─ setName()
    ├─ setPhone()
    ├─ setProfileImage(new_url)  ← UI updates
    ├─ setDeliveryAddress1()
    └─ etc.
         ↓
    Toast: "Profile updated successfully"
         ↓
    ✅ Done
```

---

## Error Handling Flow

```
saveProfile() throws error
    │
    ├─ Image upload failed?
    │   ├─ Toast shown
    │   ├─ Error caught, IGNORED ⚠️
    │   └─ Profile update continues
    │       └─ User sees old image = "reverted"
    │
    ├─ Profile update failed?
    │   ├─ Toast shown
    │   └─ Form stays editable, retry available
    │
    └─ Network timeout?
        ├─ axios timeout (typically 30s)
        ├─ Error caught
        ├─ Toast shown
        └─ Form stays editable

[NOT HANDLED]
├─ Image too large (>50MB)
├─ Blob conversion takes >30s (timeout)
├─ CORS error on image fetch (web)
├─ Permission denied (camera/gallery - mobile)
├─ JWT expired during multi-step upload
└─ Server disk full (rare)
```

---

## State Machine: Profile Editing

```
                    ┌──────────────┐
                    │  INIT STATE  │
                    └──────┬───────┘
                           │
                     useFocusEffect()
                           │
                    ┌──────▼───────────────────┐
                    │ FETCHING_PROFILE        │
    ┌──────────────►│ (network call #1)       │
    │               └──────┬────────────┬──────┘
    │                      │            │
    │                  Success      Timeout/Error
    │                      │            │
    │               ┌──────▼───────┐    └─────────┐
    │               │ READY_STATE  │              │
    │               │ (form loaded)│              │
    │               └──────┬───────┘         EMPTY
    │                      │                      │
    │                User edits +             (retry on
    │              Image selected             next focus)
    │                      │                      │
    │               ┌──────▼─────────────────┐    │
    │               │ SAVING (isSaving=true) │    │
    │               └──────┬────────┬────────┘    │
    │                      │        │             │
    │                  Success    Error           │
    │                      │        │             │
    │               ┌──────▼──┐  ┌──▼──┐          │
    │               │ READY   │  │Error│          │
    │               │ (reload)│  │Toast│          │
    │               └────┬─────┘  └──┬──┘          │
    │                    │           │             │
    │                    └─────┬─────┘             │
    │                          │                  │
    └──────────────────────────┴──────────────────┘
```

---

## Comparison Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WEB vs MOBILE                                   │
├──────────────────────┬────────────────────────┬─────────────────────────┤
│ Feature              │ WEB                    │ MOBILE (iOS/Android)    │
├──────────────────────┼────────────────────────┼─────────────────────────┤
│ Image Picker         │ File input (HTML)      │ expo-image-picker       │
│ Image URI Type       │ blob:                  │ file://                 │
│ Upload Method        │ Base64 JSON (primary)  │ Multipart (primary)     │
│ Fallback Upload      │ Multipart              │ Base64 JSON             │
│ CORS Issues          │ Maybe (blob fetch)     │ Not applicable          │
│ Permissions          │ Browser default        │ Runtime (Android 6+)    │
│ JWT Storage          │ localStorage           │ Secure Store            │
│ JWT Fallback         │ AsyncStorage           │ AsyncStorage            │
│ Profile State        │ Local state only       │ Local state only        │
│ Offline Support      │ None                   │ None                    │
│ Image Preview        │ Instant (blob)         │ Instant (file://)       │
│ Network Handling     │ axios timeout (30s)    │ axios timeout (30s)     │
│ File Encoding        │ UTF-8 (JSON-safe)      │ Binary stream           │
└──────────────────────┴────────────────────────┴─────────────────────────┘
```

---

## Critical Code Paths

### 1. Image Selection to Upload

```javascript
// File: UserProfile.js

Step 1: Pick image
pickProfileFromGallery() {
  ImagePicker.launchImageLibraryAsync({
    base64: true,          // Request base64 encoding
    quality: 0.35,         // Compress to 35%
  })
  .then(asset => {
    setNewProfileImage(asset.uri);           // Local state
    setNewProfileImageBase64(asset.base64);  // May be empty on web
    setNewProfileImageMime(asset.type);      // MIME detection
    setProfileImage(asset.uri);              // Show preview
  })
}

Step 2: Save with image
saveProfile() {
  if (newProfileImage) {
    uploadProfilePhoto(jwt)  // Network call #1
      .catch(err => {})     // Swallowed! Problem area
  }
  
  axios.put(/users/profile, {...})  // Network call #2
    .then(data => hydrateProfileForm(data))
}

Step 3: Upload image
uploadProfilePhoto(jwt) {
  const isBlob = newProfileImage.startsWith("blob:");
  
  if (isBlob) {
    // Web: Convert blob to base64
    blobUriToBase64(uri).then(base64 => {
      formData.append("imageBase64", JSON.stringify({
        data: base64,
        mime: newProfileImageMime
      }))
    })
  } else {
    // Mobile: Direct multipart
    formData.append("image", {
      uri,
      type,
      name
    })
  }
  
  axios.put(/users/profile/image, formData)
    .then(data => {
      setNewProfileImage("")  // Clear
      setNewProfileImageBase64("")
      setNewProfileImageMime("")
    })
}
```

### 2. Backend Processing

```javascript
// File: backend/routes/users.js

PUT /users/profile/image:

// Decision: Multipart or Base64?
if (req.file) {
  // Multipart (mobile)
  image = buildImageUrl(req, req.file.filename)
} else {
  // Base64 (web)
  const parsed = JSON.parse(req.body.imageBase64)
  const buffer = Buffer.from(parsed.data, "base64")
  fs.writeFileSync(filepath, buffer)
  image = buildImageUrl(req, filename)
}

// Update database
User.findByIdAndUpdate(userId, { image }, { new: true })
  .then(user => res.json(user.toJSON()))
```

---

## Takeaway

**Why Images "Revert"?**

1. Image upload fails (blob conversion, network, size)
2. Error shown to user but exception caught & ignored
3. Profile text update continues and succeeds
4. UI re-fetches from server (fresh data)
5. Server has NEW profile data but OLD image URL
6. User sees: old image displayed = "profile reverted"

**Solution**: Make image upload block profile save, or handle independently.
