# EAS Login - Quick Guide

## What You Just Did
```
✅ Installed EAS CLI globally
✅ Can now use 'eas' command anywhere
```

---

## Next Step: Login to Expo Account

You need an **Expo account** to use EAS. Do you have one?

### Option A: You Already Have an Expo Account

Run this in terminal:
```powershell
cd C:\Users\kuron\Downloads\itcp239\frontend-expo
eas login
```

Then enter:
- **Email**: Your Expo account email
- **Password**: Your Expo account password

Expected output: ✅ `✓ Logged in as: [your-username]`

---

### Option B: You Don't Have an Expo Account Yet

1. Go to: https://expo.dev/signup
2. Create account with YOUR email
3. Verify email
4. Then run:
   ```powershell
   eas login
   ```

---

## Troubleshooting

### ❌ Error: "Network error" or "Cannot reach Expo servers"
- Check internet connection
- Wait a moment and try again

### ❌ Error: "Invalid credentials"
- Check email & password are correct
- If forgot password: https://auth.expo.io/reset-password

### ✅ Success Output
```
eas login
? Email: [your-email]
? Password: [hidden input]
✓ Logged in as: yourname
```

---

## After Login

Once you see `✓ Logged in as: [username]`, you can:

```powershell
# Check who you're logged in as
eas whoami

# Configure credentials for building
eas credentials

# Or check your projects
eas project:info
```

