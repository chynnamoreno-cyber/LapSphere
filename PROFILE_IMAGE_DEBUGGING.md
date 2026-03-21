# Profile Image Upload - Debugging & Troubleshooting Guide

## Quick Diagnostics

### Symptom: Image Reverts After Save

**Step 1: Check Console Logs**

On Frontend:
```javascript
// Add to UserProfile.js > uploadProfilePhoto()

console.log('[uploadProfilePhoto] Starting upload', {
    isBlob: String(newProfileImage).startsWith("blob:"),
    hasBase64: Boolean(newProfileImageBase64),
    mimeType: newProfileImageMime,
    imageUri: newProfileImage?.slice(0, 50),
});

// After axios.put:
console.log('[uploadProfilePhoto] Success', response.data);

// On error:
console.error('[uploadProfilePhoto] Failed', error.response?.status, error.response?.data);
```

On Backend:
```javascript
// Already logging at users.js:327-328
console.log(`[PUT /users/profile/image] hasFile=${Boolean(req.file)}, hasBase64=${hasBase64}, ...`);
```

**Check logs for**:
- ✅ Image selected with correct URI type
- ✅ Base64 data present (on web)
- ✅ MIME type detected
- ❌ Upload request never sent
- ❌ 400 response (bad image data)
- ❌ 401 response (JWT expired)
- ❌ 409/500 response (server error)

---

### Step 2: Verify Network Requests

**On Web (Chrome DevTools)**:
```
1. Open DevTools → Network tab
2. Clear filters
3. Initiate profile save
4. Look for: PUT /users/profile/image request
   - Status: Should be 200 OK
   - Request size: Large (contains base64)
   - Response: Contains new image URL
5. Then look for: PUT /users/profile request
   - Status: Should be 200 OK
```

**Check timings**:
- Image upload takes 2-5 seconds? **GOOD** (base64 encoding overhead)
- Image upload takes >30 seconds? **BAD** (will timeout)
- No image upload request at all? **PROBLEM** - Check blob conversion

---

### Step 3: Test Image Upload Independently

**Create test endpoint** (temporary):

```javascript
// Test inside saveProfile(), BEFORE actual save:

const testUpload = async (jwt) => {
    if (!newProfileImage) {
        console.warn('[TEST] No image selected');
        return;
    }
    
    console.log('[TEST] Starting image upload test...');
    const formData = new FormData();
    
    const isBlob = String(newProfileImage).startsWith("blob:");
    let base64ToSend = newProfileImageBase64;
    
    if ((!base64ToSend || base64ToSend.length === 0) && isBlob) {
        console.log('[TEST] Blob detected, converting to base64...');
        base64ToSend = await blobUriToBase64(newProfileImage);
        console.log('[TEST] Base64 conversion result:', {
            success: Boolean(base64ToSend),
            length: base64ToSend?.length || 0
        });
    }
    
    if (base64ToSend) {
        formData.append("imageBase64", JSON.stringify({
            data: base64ToSend,
            mime: newProfileImageMime || "image/jpeg",
        }));
        console.log('[TEST] Sending base64, payload size:', 
            new Blob([base64ToSend]).size / 1024, 'KB');
    } else {
        const fileUri = newProfileImage.startsWith("file://") 
            ? newProfileImage 
            : `file://${newProfileImage}`;
        formData.append("image", {
            uri: fileUri,
            type: mime.getType(fileUri) || "image/jpeg",
            name: fileUri.split("/").pop() || `profile-${Date.now()}.jpg`,
        });
        console.log('[TEST] Sending multipart file:', fileUri);
    }
    
    try {
        const response = await axios.put(
            `${baseURL}users/profile/image`, 
            formData,
            { headers: { Authorization: `Bearer ${jwt}` } }
        );
        console.log('[TEST] ✅ Upload successful!', response.data.image);
    } catch (error) {
        console.error('[TEST] ❌ Upload failed!', {
            status: error.response?.status,
            message: error.response?.data?.message,
            error: error.message
        });
    }
};

// Call in saveProfile() BEFORE image upload:
// await testUpload(jwt);
```

---

## Scenario-Based Troubleshooting

### Scenario 1: Web (Blob URI Conversion Fails)

**Symptoms**:
- Selected image preview shows
- "Image upload failed" toast
- Network tab shows NO PUT /profile/image request

**Diagnosis**:
```javascript
// The blob conversion is failing silently
// Add logging to blobUriToBase64()

const blobUriToBase64 = async (uri) => {
    if (!uri || !String(uri).startsWith("blob:")) {
        console.log('[blobUriToBase64] Not a blob URI:', uri?.slice(0, 30));
        return null;
    }
    
    try {
        console.log('[blobUriToBase64] Converting blob:', uri?.slice(0, 50));
        const response = await fetch(uri);
        console.log('[blobUriToBase64] Fetch response:', response.status);
        
        if (!response.ok) {
            console.error('[blobUriToBase64] Fetch failed:', response.statusText);
            return null;
        }
        
        const blob = await response.blob();
        console.log('[blobUriToBase64] Blob size:', blob.size, 'bytes');
        
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => {
                console.error('[blobUriToBase64] Reader error');
                reject(new Error("Failed to read blob"));
            };
            reader.onloadend = () => {
                const result = String(reader.result || "");
                const commaIdx = result.indexOf(",");
                const base64Data = commaIdx >= 0 ? result.slice(commaIdx + 1) : "";
                console.log('[blobUriToBase64] Converted, length:', base64Data.length);
                resolve(base64Data);
            };
            reader.readAsDataURL(blob);
        });
        return base64 || null;
    } catch (_error) {
        console.error('[blobUriToBase64] Exception:', _error.message);
        return null;
    }
};
```

**Common Causes**:
- Blob URI expired (garbage collected)
- CORS restrictions on blob fetch
- Browser security sandbox

**Solutions**:
- Request base64 in ImagePicker: `base64: true`
- Use base64 immediately after selection
- Add retry with re-selection

---

### Scenario 2: Mobile (Multipart Upload Fails)

**Symptoms**:
- Image selected
- No request sent or request hangs
- "Image upload failed" after timeout

**Diagnosis - Check Android Permissions**:
```javascript
// Add permission check to UserProfile.js

import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";

const checkPermissions = async () => {
    // Check gallery
    const libStatus = await MediaLibrary.requestPermissionsAsync();
    console.log('[Permissions] Gallery:', libStatus.status, libStatus.granted);
    
    // Check camera
    const camStatus = await ImagePicker.requestCameraPermissionsAsync();
    console.log('[Permissions] Camera:', camStatus.status, camStatus.granted);
    
    if (!libStatus.granted || !camStatus.granted) {
        Toast.show({
            type: 'error',
            text1: 'Please grant permissions',
            text2: 'Gallery and camera access required'
        });
        return false;
    }
    return true;
};

// Call before picking:
const pickProfileFromGallery = async () => {
    if (!await checkPermissions()) return;
    // proceed with picker
};
```

**Check AndroidManifest.xml**:
```xml
<!-- /android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

**Check app.json**:
```json
// frontend-expo/app.json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow LapSphere to access your gallery",
          "cameraPermission": "Allow LapSphere to use your camera"
        }
      ]
    ]
  }
}
```

---

### Scenario 3: Backend Receives Image But Doesn't Save

**Symptoms**:
- Network tab shows 200 response
- Response contains image URL
- But image URL is for old image

**Backend Diagnosis** (add logging):

```javascript
// backend/routes/users.js:283-353

router.put("/profile/image", authJwt, upload.single("image"), async (req, res) => {
  try {
    console.log('[PROFILE_IMAGE] === REQUEST START ===');
    console.log('[PROFILE_IMAGE] userId:', req.user?.userId);
    console.log('[PROFILE_IMAGE] hasFile:', Boolean(req.file));
    console.log('[PROFILE_IMAGE] hasImageBase64:', Boolean(req.body?.imageBase64));
    
    if (req.file) {
      console.log('[PROFILE_IMAGE] Using Multer file:');
      console.log('  - filename:', req.file.filename);
      console.log('  - size:', req.file.size, 'bytes');
      console.log('  - mimetype:', req.file.mimetype);
      
      image = buildImageUrl(req, req.file.filename);
      console.log('[PROFILE_IMAGE] Built image URL:', image);
    } else {
      console.log('[PROFILE_IMAGE] Using base64 upload');
      
      const parsed = JSON.parse(req.body?.imageBase64 || '{}');
      const data = String(parsed?.data || "").trim();
      console.log('[PROFILE_IMAGE] Base64 data length:', data.length);
      console.log('[PROFILE_IMAGE] Mime type:', parsed?.mime);
      
      const buffer = Buffer.from(data, "base64");
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      fs.writeFileSync(path.join(uploadPath, filename), buffer);
      
      image = buildImageUrl(req, filename);
      console.log('[PROFILE_IMAGE] Wrote file, URL:', image);
    }
    
    console.log('[PROFILE_IMAGE] Updating user with image:', image);
    const user = await User.findByIdAndUpdate(
      req.user.userId, 
      { image }, 
      { new: true }
    );
    console.log('[PROFILE_IMAGE] Updated user, image field:', user.image);
    console.log('[PROFILE_IMAGE] === SUCCESS ===');
    
    return res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('[PROFILE_IMAGE] ERROR:', error.message);
    return res.status(500).json({ message: "Failed to update profile image" });
  }
});
```

**Check logs for**:
- `hasFile: false` but `hasImageBase64: false` → Nothing uploaded!
- `data.length: 0` → Base64 corrupted
- `Updated user, image field: ""` → Database write failed
- MongoDB connection error → Server can't save

---

### Scenario 4: Time-of-Check-Time-of-Use (TOCTOU) Bug

**Symptoms**:
- Two requests interfere with each other
- Profile image changes back and forth
- Race condition behavior

**Diagnosis - Check request ordering**:

```javascript
// Frontend - add request logging

const uploadProfilePhoto = async (jwt) => {
    console.time('[UPLOAD_IMAGE]');
    // ... upload
    console.timeEnd('[UPLOAD_IMAGE]');
};

const saveProfile = async () => {
    console.time('[SAVE_PROFILE]');
    
    if (newProfileImage) {
        await uploadProfilePhoto(jwt);  // Network call #1
    }
    
    // Network call #2
    const response = await axios.put(`${baseURL}users/profile`, payload, ...);
    console.timeEnd('[SAVE_PROFILE]');
};
```

**If both requests fire simultaneously**:
- Image upload POST response arrives AFTER profile update
- Server receives: 1) Profile text + old image, 2) Image update
- But they race to update same document
- Result: Inconsistent state

**Solution**: Chain the requests properly (already done in code)

---

## Network Monitoring

### Using axios Interceptors

Add to App.js or create interceptor file:

```javascript
import axios from 'axios';

axios.interceptors.request.use(
    config => {
        console.log('[AXIOS] Request:', config.method.toUpperCase(), config.url);
        console.log('[AXIOS] Data size:', 
            config.data instanceof FormData ? '[FormData]' : 
            typeof config.data === 'string' ? config.data.length + ' chars' :
            '[Object]'
        );
        return config;
    },
    error => Promise.reject(error)
);

axios.interceptors.response.use(
    response => {
        console.log('[AXIOS] Response:', response.status, response.config.url);
        return response;
    },
    error => {
        console.error('[AXIOS] Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.response?.data?.message || error.message
        });
        return Promise.reject(error);
    }
);
```

---

## Production Debugging Checklist

- [ ] Enable backend logging with timestamps
- [ ] Add request ID tracking (correlate frontend ↔ backend logging)
- [ ] Monitor file upload sizes to S3/disk
- [ ] Alert on image URL building failures
- [ ] Track blob conversion failures (Sentry/ErrorBoundary)
- [ ] Monitor JWT expiration during uploads
- [ ] Log permission denial events
- [ ] Collect user reports with timestamp + userId

---

## Testing Verification

### Unit Test: Image Upload Path

```javascript
describe('Image Upload', () => {
  it('should upload base64 on web', async () => {
    // Mock ImagePicker to return blob: URI
    // Mock fetch to return valid blob
    // Mock axios.put to return 200
    // Verify formData contains imageBase64 JSON
  });
  
  it('should upload multipart on mobile', async () => {
    // Mock ImagePicker to return file:// URI
    // Verify FormData contains image multipart
  });
  
  it('should handle blob conversion failure', async () => {
    // Mock fetch to reject
    // Verify error toast shown
    // Verify exception caught
  });
  
  it('should not save profile if image upload fails', async () => {
    // Mock image upload to reject
    // Verify profile save does NOT proceed (after fix)
  });
});
```

---

## Performance Optimization Tips

1. **Image Compression**:
   - Current: 35% quality
   - Consider: Resize to max 512x512 before upload
   - Reduces base64 payload by 70%

2. **Base64 Streaming** (for large images):
   - Instead of `Buffer.from(data, "base64")` all at once
   - Use streams to write chunks to disk

3. **Request Timeout**:
   - Set axios timeout for image upload: `timeout: 60000` (60 seconds)
   - Current: Default 30s (may fail on slow connections)

4. **Retry Logic**:
   - Implement exponential backoff for failed uploads
   - Retry up to 3 times before showing error

---

## Reference: Normal vs Error Flow

**Normal Flow** (all network calls succeed):
```
✅ Image selected
✅ Image preview shown
✅ PUT /profile/image → 200 OK
✅ Image URL updated in response
✅ PUT /profile → 200 OK
✅ Profile updated in response
✅ Local state hydrated
✅ SUCCESS toast
```

**Error Flow** (current - image fails):
```
✅ Image selected
✅ Image preview shown
❌ PUT /profile/image → 400/500/timeout
❌ ERROR toast shown
❌ Exception caught & ignored
✅ PUT /profile → 200 OK (continues anyway!)
✅ Profile updated
✅ hydrateProfileForm() re-fetches from server
❌ Server has new profile data but OLD image
❌ Image appears "reverted"
```

**Fixed Flow** (recommended):
```
✅ Image selected
✅ Image preview shown
❌ PUT /profile/image → 400/500/timeout
❌ ERROR toast shown
❌ Exception NOT caught - save stops here
❌ User must retry or select different image
```
