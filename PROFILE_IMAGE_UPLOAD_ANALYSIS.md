# User Profile Update & Image Upload Flow - Complete Analysis

## Executive Summary

The LapSphere mobile app has two independent storage/state management systems:
- **Authentication Context** (AuthGlobal) - handles JWT and user session
- **Redux Store** - handles cart, products, orders, reviews (NOT user profile)

**Profile data is NOT persisted in Redux** - it's fetched fresh on screen focus and stored in local component state. Images are uploaded directly on save, with dual support for:
- Base64 encoding (web `blob:` URIs)
- Multipart form data (mobile `file://` URIs)

---

## 1. User Profile Update Flow

### 1.1 Frontend - Web vs Mobile (Mobile Primary)

**Platform**: Expo React Native (iOS/Android primary, web secondary)

**Storage Used**:
- **JWT Token**: Expo Secure Store (with AsyncStorage fallback for web/legacy)
- **User Profile**: AuthGlobal Context + Local Component State (NOT Redux)
- **Cart**: Redux + SQLite/AsyncStorage
- **Profile Form**: Local state (freshly loaded on screen focus)

#### State Management Hierarchy:
```
AuthGlobal Context
├── isAuthenticated (boolean)
├── user (JWT decoded - contains userId only)
└── userProfile (deprecated - not actively used)

UserProfile Component State
├── name, phone
├── deliveryAddress1, deliveryAddress2, deliveryCity, deliveryZip, deliveryCountry
├── deliveryLocation (lat/lng object)
├── profileImage (current server image)
├── newProfileImage (selected local image)
├── newProfileImageBase64 (base64 conversion)
└── newProfileImageMime (detected MIME type)
```

### 1.2 Profile Data Fetching Flow

**Trigger**: Component mount or screen focus (via `useFocusEffect`)

```
UserProfile.js (useFocusEffect)
    ↓
getJwtToken() [authToken.js]
    ├─ Try: Expo Secure Store
    ├─ Fallback: AsyncStorage (legacy migration)
    └─ Returns: JWT string
    ↓
axios.get(`{baseURL}users/{userId}`, headers: { Authorization: `Bearer {jwt}` })
    ↓
Backend: GET /users/:id [authJwt middleware validates JWT]
    ↓
User.findById() [MongoDB fetch]
    ↓
Response: Full user object including image URL
    ↓
hydrateProfileForm(user.data)
    └─ Updates all local state variables
```

**Key Files**:
- Frontend: [UserProfile.js](frontend-expo/Screens/User/UserProfile.js#L90-L110)
- Backend: [users.js](backend/routes/users.js#L197-L215) - GET endpoint
- Auth: [authToken.js](frontend-expo/assets/common/authToken.js) - JWT retrieval

---

## 2. Image/Profile Picture Upload Flow

### 2.1 Image Selection (Gallery/Camera)

**React Native Library**: `expo-image-picker` (Expo managed)

#### Gallery Selection:
```javascript
// [UserProfile.js:122-136]
const pickProfileFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.35,           // 35% compression
        base64: true,             // Request base64 encoding
    });
    
    if (!result.canceled) {
        const asset = result.assets[0];
        setNewProfileImage(asset.uri);              // Local preview
        setNewProfileImageMime(asset.type || ...);  // MIME detection
        setNewProfileImageBase64(asset.base64 || "");
        setProfileImage(asset.uri);                 // Show preview immediately
    }
};
```

#### Camera Capture:
```javascript
// [UserProfile.js:138-152]
const takeProfilePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.35,
        base64: true,
    });
    // Same as gallery selection
};
```

**Image URI Types**:
- **Mobile (iOS/Android)**: `file://` URIs
- **Web**: `blob:` URIs (cannot be persisted directly)

**Important**: `base64` field may be empty on web environments - handled lazily during upload.

### 2.2 Image Upload Process (uploadProfilePhoto)

**Endpoint**: `PUT /users/profile/image`

#### Upload Strategy (Smart Dual-Mode):
```javascript
// [UserProfile.js:161-212]
const uploadProfilePhoto = async (jwt) => {
    if (!newProfileImage) return null;
    
    const formData = new FormData();
    
    // ─── PREFERRED: Base64 for web blob: URIs ───────────────────
    const isBlob = String(newProfileImage).startsWith("blob:");
    let base64ToSend = newProfileImageBase64;
    
    // Lazy conversion if not provided
    if ((!base64ToSend || base64ToSend.length === 0) && isBlob) {
        base64ToSend = await blobUriToBase64(newProfileImage);
    }
    
    // Fail gracefully if blob conversion fails
    if (isBlob && (!base64ToSend || base64ToSend.length === 0)) {
        Toast.show({
            type: "error",
            text1: "Image upload failed",
            text2: "Could not convert selected photo",
        });
        throw new Error("Image conversion failed");
    }
    
    if (base64ToSend) {
        // ✅ WEB PATH: Send JSON with base64 data
        formData.append("imageBase64", JSON.stringify({
            data: base64ToSend,
            mime: newProfileImageMime || "image/jpeg",
        }));
    } else {
        // ✅ MOBILE PATH: Send multipart file
        const fileUri = newProfileImage.startsWith("file://") 
            ? newProfileImage 
            : `file://${newProfileImage}`;
        
        formData.append("image", {
            uri: fileUri,
            type: mime.getType(fileUri) || "image/jpeg",
            name: fileUri.split("/").pop() || `profile-${Date.now()}.jpg`,
        });
    }
    
    try {
        const response = await axios.put(
            `${baseURL}users/profile/image`, 
            formData,
            { headers: { Authorization: `Bearer ${jwt}` } }
        );
        
        // Clear new image state after successful upload
        setNewProfileImage("");
        setNewProfileImageBase64("");
        setNewProfileImageMime("");
        
        return response.data;
    } catch (error) {
        Toast.show({
            type: "error",
            text1: "Image upload failed",
            text2: error?.response?.data?.message || error.message,
        });
        throw error;
    }
};
```

### 2.3 Image Upload Backend Processing

**Route**: `PUT /users/profile/image` [users.js:283-353]

#### Backend Flow:
```
Incoming Request
├─ middleware: authJwt validates token
├─ middleware: upload.single("image") processes multipart/form-data
└─ req.body.imageBase64 (if JSON sent from web)

Processing Decision Tree:
├─ IF req.file exists (mobile multipart)
│   └─ Use Multer-saved file → buildImageUrl()
│
└─ ELSE (web base64)
    └─ Parse req.body.imageBase64 JSON
        ├─ Extract base64 data string
        ├─ Determine MIME type (png/jpg)
        ├─ Write to disk as {timestamp}-{random}.{ext}
        └─ Return buildImageUrl()

Final Step:
    User.findByIdAndUpdate(userId, { image }, { new: true })
    └─ MongoDB updates document with new image URL
    └─ Returns full user object
```

#### Backend Implementation:
```javascript
router.put("/profile/image", authJwt, upload.single("image"), async (req, res) => {
  try {
    // Parse base64 JSON (web) or use multipart file (mobile)
    const materializeBase64ProfileImage = () => {
      const parsed = parseJson(req.body?.imageBase64);
      let data = String(parsed?.data || "").trim();
      const mimeType = String(parsed?.mime || "").trim() || "image/jpeg";
      
      if (!data) return null;
      
      // Remove data URI prefix if present
      const commaIdx = data.indexOf(",");
      if (data.startsWith("data:") && commaIdx >= 0) {
        data = data.slice(commaIdx + 1);
      }
      
      // Write base64 to disk
      const ext = mimeType.includes("png") ? ".png" : ".jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
      const buffer = Buffer.from(data, "base64");
      const filepath = path.join(uploadPath, filename);
      fs.writeFileSync(filepath, buffer);
      
      return buildImageUrl(req, filename);
    };
    
    let image = "";
    if (req.file) {
      // Mobile: Multer saved directly
      image = buildImageUrl(req, req.file.filename);
    } else {
      // Web: Process base64
      const fromBase64 = materializeBase64ProfileImage();
      if (!fromBase64) {
        return res.status(400).json({ message: "Profile image is required" });
      }
      image = fromBase64;
    }
    
    // Update MongoDB
    const user = await User.findByIdAndUpdate(
      req.user.userId, 
      { image }, 
      { new: true }
    );
    
    return res.status(200).json(user.toJSON());
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update profile image" });
  }
});
```

**Key Backend Files**:
- [users.js](backend/routes/users.js#L283-L353) - Image upload endpoint
- [Multer config](backend/routes/users.js#L18-L38) - Upload storage setup
- [buildImageUrl helper](backend/routes/users.js#L46-L49) - Constructs image URLs

---

## 3. Backend Integration

### 3.1 API Endpoints

#### Profile Update Endpoints:

| Method | Route | Auth | Payload | Returns |
|--------|-------|------|---------|---------|
| GET | `/users/:id` | JWT | None | Full user object |
| PUT | `/users/profile` | JWT | name, phone, delivery address fields, deliveryLocation | Updated user |
| PUT | `/users/profile/image` | JWT | `image` (multipart) OR `imageBase64` (JSON) | Updated user with new image URL |

#### Authentication:

```javascript
// middleware/authJwt.js
const authJwt = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });
    
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid token" });
        req.user = decoded;  // Contains userId, email, name, isAdmin
        next();
    });
};
```

### 3.2 Response Format

```json
{
  "_id": "usuario123",
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "image": "http://localhost:5000/uploads/1709456789-abc123.jpg",
  "deliveryAddress1": "123 Main St",
  "deliveryAddress2": "Apt 4B",
  "deliveryCity": "New York",
  "deliveryZip": "10001",
  "deliveryCountry": "USA",
  "deliveryLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "isAdmin": false,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 3.3 Error Handling

**Common Errors**:

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "Profile image is required" | No `image` file OR no valid `imageBase64` data |
| 400 | "deliveryLocation must include numeric latitude and longitude" | Invalid lat/lng format |
| 401 | "Invalid token" | JWT expired or malformed |
| 404 | "User not found" | userId doesn't exist |
| 500 | "Failed to update profile" / "Failed to update profile image" | Server error during save |

**Frontend Error Display** (Toast notifications):
```javascript
Toast.show({
    topOffset: 60,
    type: "error",
    text1: "Image upload failed",
    text2: error?.response?.data?.message || error.message
});
```

---

## 4. Potential Issues & Root Causes

### 4.1 Images Revert to Original - Root Causes

#### **Issue #1: Image Upload Fails Silently**
```
📍 Location: [UserProfile.js:235-241]

saveProfile() {
    // Upload profile photo if one was selected
    if (newProfileImage) {
        try {
            await uploadProfilePhoto(jwt);
        } catch (_error) {
            // ⚠️ ERROR SWALLOWED: Error shown to user but execution continues
            // Continue with profile update even if image upload failed
        }
    }
}
```

**Problem**: Image upload error doesn't block profile save. User sees error toast but continues. Then:
1. Profile data is saved to backend
2. imageUpload fails (connection, conversion, 400 error)
3. Component re-fetches fresh data from server (which has NEW profile data but OLD image)
4. UI updates showing old image

**User Perception**: "Image reverted after saving"

**Fix Locations** (if needed):
- [UserProfile.js:235-241](frontend-expo/Screens/User/UserProfile.js#L235-L241)

#### **Issue #2: Blob URI Conversion Failure (Web)**
```
📍 Location: [UserProfile.js:38-54]

const blobUriToBase64 = async (uri) => {
    if (!uri || !String(uri).startsWith("blob:")) return null;
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Failed to read blob"));
            reader.onloadend = () => {
                // Convert to base64...
            };
            reader.readAsDataURL(blob);
        });
        return base64 || null;
    } catch (_error) {
        return null;  // ⚠️ Silently fails, returns null
    }
};
```

**Scenarios**:
- Web FileReader can't access `blob:` URI (CORS, sandbox)
- Promise times out
- Blob is garbage collected

**Result**: 
1. `base64ToSend = null`
2. Falls back to multipart upload with `blob:` URI
3. Backend receives invalid URI (can't process)
4. 400 error: "Profile image is required"

#### **Issue #3: Base64 Size Limits**
```
📍 Location: [backend/routes/users.js:30-37]

const upload = multer({
    limits: {
        fileSize: config.maxFileSizeMb * 1024 * 1024,  // e.g., 50MB
        fieldSize: 200 * 1024 * 1024,                  // 200MB allowance
    },
});
```

**Problem**: Large images (after compression) still generate large base64 strings:
- 3000x3000 JPEG @ 35% quality ≈ 800KB
- Base64 increases size by ~33%
- Plus JSON overhead

If `fieldSize` < base64 size, request fails before backend processes.

#### **Issue #4: Network Request Midway**
```
saveProfile() {
    if (newProfileImage) {
        try {
            await uploadProfilePhoto(jwt);  // Network call #1
        } catch (_error) {}
    }
    
    // Network call #2 happens even if #1 failed
    const response = await axios.put(`${baseURL}users/profile`, payload, {});
}
```

**Scenario**: Connection drops between the two requests:
1. Image upload succeeds, but response never arrives
2. Mobile/web retries, times out
3. Exception caught, silently ignored
4. Profile update continues
5. New profile data saved WITHOUT image URL update

**Result**: Image URL not updated in database, old image shown.

#### **Issue #5: JWT Expiration During Upload**
```
imageUpload (JWT obtained here)
    ↓
Waiting for image processing (30-60 seconds on slow connection)
    ↓
JWT expires (typically 12-24 hours, but could be shorter in testing)
    ↓
Backend returns 401/403 Unauthorized
```

Though unlikely in normal operation.

### 4.2 Storage & State Management Issues

#### **Issue #6: AsyncStorage vs Secure Store Inconsistency**
```
📍 Location: [authToken.js:26-65]

// JWT may be in:
// ├─ Expo Secure Store (primary - not accessible to others)
// ├─ AsyncStorage (secondary - plain text, less secure)
// └─ Neither (logged out)
```

**On Mobile**:
- Secure Store prioritized (safer)
- AsyncStorage as fallback

**On Web**:
- localStorage used (not AsyncStorage - minor confusion in code naming)

**Problem**: During app recovery after crash:
1. JWT might be in inconsistent state
2. `getJwtToken()` may return stale or missing token
3. API requests fail with 401
4. User can't fetch/update profile

**Mitigation**: Re-login required.

#### **Issue #7: No Redux Persistence for User Profile**
```
📍 Redux Store Only Contains:
├── cartItems
├── products
├── orders
└── reviews

❌ User profile NOT in Redux
```

**Why It Matters**:
- Redux data persists in AsyncStorage
- User profile is transient (localState only)
- On navigation away and back to profile → re-fetches from server
- If server is down, blank form appears

**Design Tradeoff**:
- ✅ Always fresh data from server
- ❌ No offline support for profile edits

### 4.3 Form Validation & UX Issues

#### **Issue #8: Required Fields Validation**
```javascript
// [UserProfile.js:54-62]
const requiredProfileFields = {
    phone: String(phone || "").trim(),
    deliveryAddress1: String(deliveryAddress1 || "").trim(),
    deliveryCity: String(deliveryCity || "").trim(),
    deliveryZip: String(deliveryZip || "").trim(),
    deliveryCountry: String(deliveryCountry || "").trim(),
};
```

**Problem**: 
- Checkout requires address fields complete
- But no error shown if trying to save with missing fields
- Save button doesn't disable on validation failure
- User sees "Checkout Ready" / "Profile Incomplete" badge but can still save

**Fix Needed**: 
- Disable save if required fields empty
- Or show validation errors

#### **Issue #9: No Optimistic UI Updates**
```javascript
uploadProfilePhoto(jwt)  // Returns new image URL
    ↓
Profile state updated with server response
    ↓
Then profile re-fetches entire user object
```

**Gap**: Image immediately updated locally, but:
- If re-fetch hits old cache, old image briefly appears
- No manual optimistic update to local state

### 4.4 Network & Permissions Issues

#### **Issue #10: Image Picker Permissions (Mobile)**
```
📍 Location: [ProductForm.js:78-81, but same for UserProfile]

ImagePicker.requestMediaLibraryPermissionsAsync()
ImagePicker.requestCameraPermissionsAsync()
```

**Android Issues**:
- Runtime permissions required (Android 6+)
- READ_EXTERNAL_STORAGE not granted → picker opens but can't access photos
- CAMERA not granted → camera button fails silently

**iOS Issues**:
- NSPhotoLibraryUsageDescription missing → app crashes on first picker open
- NSCameraUsageDescription missing → camera fails

**Frontend Handling**: No explicit permission check before launching picker.

#### **Issue #11: CORS on Web**
```
blob: URLs have strict CORS rules
```

**If backend serves images from different domain** (CDN, S3):
- Image fetch fails
- Base64 conversion may fail
- Fallback to multipart also fails if CORS not configured

---

## 5. Comparison: Web vs Mobile

| Aspect | Web | Mobile (iOS/Android) |
|--------|-----|-----|
| **Image URI Type** | `blob:` | `file://` |
| **Upload Preferred** | Base64 JSON | Multipart form data |
| **Storage (JWT)** | localStorage | Secure Store (or AsyncStorage) |
| **Storage (Cart)** | AsyncStorage | SQLite + AsyncStorage |
| **Profile State** | Local state | Local state |
| **Permissions** | Browser permissions | Runtime permissions (Android) |
| **Offline Support** | None (profile) | None (profile) |

**Key Difference**: 
- **Mobile** prefers multipart file upload (native API)
- **Web** prefers base64 JSON (blob: URI persistence issue)
- Backend handles both automatically

---

## 6. Data Flow Diagram

### Profile Save Complete Flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                  USER TAPS "SAVE PROFILE"                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────────────────────────┐
          │  saveProfile() [UserProfile.js:224]   │
          └───────────────────────────────────────┘
                              ↓
                  ┌─────────────────────────┐
                  │ getJwtToken() [authToken.js] │
                  └─────────────────────────┘
                              ↓
              ┌───────────────────────────────────┐
              │ newProfileImage set?               │
              └───────────────────────────────────┘
                        /            \
                      YES              NO
                       ↓                ↓
        ┌─────────────────────┐   [skip image upload]
        │ uploadProfilePhoto()│
        └─────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ Base64 or multipart?         │
        ├──────────────────────────────┤
        │ IF blob: URI → base64        │
        │ IF file: URI → multipart     │
        └──────────────────────────────┘
                       ↓
    ┌───────────────────────────────────────┐
    │ axios.put(/users/profile/image)       │  [Network Call #1]
    │   Authorization: Bearer {jwt}         │
    │   Content-Type: multipart/form-data   │  or
    │                 application/json      │
    └───────────────────────────────────────┘
                       ↓
    ┌───────────────────────────────────────┐
    │ [BACKEND: authJwt validation]         │
    │ [BACKEND: process image → upload dir] │
    │ [BACKEND: User.findByIdAndUpdate]     │
    │ [BACKEND: Return user object]         │
    └───────────────────────────────────────┘
                       ↓
    ┌──────────────────────────────────────────┐
    │ Clear: newProfileImage, newProfileImage  │
    │ Base64, newProfileImageMime              │
    └──────────────────────────────────────────┘
                       ↓
    ┌──────────────────────────────┐
    │ axios.put(/users/profile)    │  [Network Call #2]
    │   Authorization: Bearer {jwt}│
    │   Payload: {name, phone, ... }
    │   deliveryLocation (if set)  │
    └──────────────────────────────┘
                       ↓
    ┌───────────────────────────────────┐
    │ [BACKEND: authJwt validation]     │
    │ [BACKEND: User.findByIdAndUpdate] │
    │ [BACKEND: Return updated user]    │
    └───────────────────────────────────┘
                       ↓
    ┌──────────────────────────┐
    │ hydrateProfileForm()     │  ← Reload all state from response
    │ Update all local state   │
    └──────────────────────────┘
                       ↓
    ┌──────────────────────────────────┐
    │ Toast: "Profile updated"         │
    │ setIsSaving(false)               │
    └──────────────────────────────────┘
```

### Error Scenarios:

```
IMAGE UPLOAD FAILS
        ↓
Error toast shown
        ↓
Exception caught, ignored  ⚠️
        ↓
Profile update continues anyway
        ↓
Profile saved WITHOUT image update
        ↓
User sees old image after saving (perception: "reverted")

────────────────────────────────────────

PROFILE UPDATE FAILS
        ↓
Error toast shown
        ↓
Form remains editable
        ↓
User can retry
```

---

## 7. Key Files Reference

### Frontend (React Native - Expo)

| File | Purpose |
|------|---------|
| [UserProfile.js](frontend-expo/Screens/User/UserProfile.js) | Main profile screen (image picker, form, save logic) |
| [authToken.js](frontend-expo/assets/common/authToken.js) | JWT get/set/remove (Secure Store + AsyncStorage) |
| [Auth.actions.js](frontend-expo/Context/Actions/Auth.actions.js) | Login, logout, user dispatch |
| [Auth.reducer.js](frontend-expo/Context/Reducers/Auth.reducer.js) | Auth context reducer |
| [AuthGlobal.js](frontend-expo/Context/Store/AuthGlobal.js) | Auth context creation |
| [baseurl.js](frontend-expo/assets/common/baseurl.js) | API base URL config |

### Backend (Express + MongoDB)

| File | Purpose |
|------|---------|
| [users.js](backend/routes/users.js) | All user endpoints (register, login, get profile, update profile, image upload) |
| [User.js](backend/models/User.js) | MongoDB user schema |
| [authJwt.js](backend/middleware/authJwt.js) | JWT validation middleware |
| [config/index.js](backend/config/index.js) | Configuration (uploadDir, maxFileSizeMb, jwtSecret) |

---

## 8. Recommendations & Improvements

### High Priority

1. **Fix Image Upload Error Handling**
   - Make image upload errors block profile save
   - Or retry image upload separately if profile save succeeds
   - Location: [UserProfile.js:235-241](frontend-expo/Screens/User/UserProfile.js#L235-L241)

2. **Add Loading State for Image Upload**
   - Show spinner during image processing
   - Disable save button until upload complete
   - Current: Only `isSaving` state covers profile text, not image

3. **Validate Required Fields Before Save**
   - Disable "Save Profile" button if address incomplete
   - Show inline validation errors
   - Current: Validation only in badge display

4. **Handle Offline Scenarios**
   - Cache profile data in AsyncStorage/SQLite
   - Allow offline editing (sync on reconnect)
   - Current: No offline support - blank form if network fails

### Medium Priority

5. **Optimize Image Upload**
   - Add proper image compression (resize to 512x512 or smaller)
   - Implement upload progress indicator
   - Current: 35% quality but size still large on 3000x3000 images

6. **Add Image Crop/Preview UI**
   - Show selected image preview before uploading
   - Option to retake/reselect
   - Current: Shows in state but limited feedback

7. **Standardize Error Messages**
   - Add specific error codes (e.g., "ERR_IMAGE_TOO_LARGE")
   - Better UX messaging
   - Current: Generic "Image upload failed"

### Low Priority

8. **Add Redux Support for Profile** (Optional)
   - Persist profile in Redux + AsyncStorage
   - Enable offline profile viewing
   - Current design is acceptable (API-first)

9. **Monitor Image Upload Failures**
   - Add analytics/logging for blob conversion failures
   - Track which users hit image issues
   - Identify patterns

10. **Consider CDN for Images**
    - Move uploads to S3/Cloudinary
    - Better performance & reliability
    - Current: Local filesystem storage

---

## 9. Testing Checklist

- [ ] Upload profile image on mobile (camera + gallery)
- [ ] Upload profile image on web
- [ ] Verify image persists after app restart
- [ ] Test with large images (>5MB) and verify compression
- [ ] Test with network interruption during image upload
- [ ] Verify image fails gracefully and doesn't block profile save
- [ ] Test profile save without image change
- [ ] Test address change with and without image
- [ ] Test offline then reconnect (profile refetch)
- [ ] Verify JWT refresh on token expiry
- [ ] Test with slow network (observe spinners/states)

---

## Summary Table

| Component | Technology | Storage | State | Sync |
|-----------|-----------|---------|-------|------|
| **JWT Token** | Expo Secure Store / AsyncStorage | Device encrypted/plain | AuthGlobal | Manual (login/logout) |
| **User Profile** | REST API (GET/PUT) | MongoDB | Local state + AuthGlobal | On screen focus |
| **Profile Image** | Base64 (web) / Multipart (mobile) | Server file system | Local temp state | On save |
| **Cart** | Redux + SQLite/AsyncStorage | Device database | Redux store | On app init |
| **Profile Form** | React state (useState) | RAM | Local component | On mount/save |

---

**Last Updated**: 2024
**Status**: ✅ Full Analysis Complete
