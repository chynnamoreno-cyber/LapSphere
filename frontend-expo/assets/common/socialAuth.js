/**
 * [MP2] Google sign-in client IDs.
 * - Create OAuth 2.0 client IDs at console.cloud.google.com.
 * - Use Android client ID for APK builds, Web client ID for Expo Go testing.
 * - Set GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS in backend .env to match the client ID used.
 * Leave empty strings to hide the Google button.
 */
export const GOOGLE_WEB_CLIENT_ID = "1061265006776-o9bftfr2f16nmb99nqg9o50d593i1h71.apps.googleusercontent.com"; // Web client ID
export const GOOGLE_ANDROID_CLIENT_ID = "1061265006776-8k5hac1d8h9flh8l9pripeh18n9m1fsg.apps.googleusercontent.com"; // Android client ID for APK/dev build
export const GOOGLE_IOS_CLIENT_ID = ""; // iOS client ID if needed
export const GOOGLE_EXPO_CLIENT_ID = "1061265006776-o9bftfr2f16nmb99nqg9o50d593i1h71.apps.googleusercontent.com"; // Expo client ID (optional)
