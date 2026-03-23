/**
 * Firebase Configuration for Frontend
 * WARNING: This file contains PUBLIC credentials only (safe for frontend)
 * Never include private keys or server credentials here
 */

export const firebaseConfig = {
  // IMPORTANT: Get these values from Firebase Console (Project Settings)
  // https://console.firebase.google.com/project/lapsphere-78b14/settings/general
  
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDv...", // Replace with your public API key
  authDomain: "lapsphere-78b14.firebaseapp.com",
  projectId: "lapsphere-78b14",
  storageBucket: "lapsphere-78b14.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1061265006776",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1061265006776:web:...", // Replace with your app ID
};

// For Expo, we use environment variables from .env.local or EAS secrets
// Set these in your .env.local file or via EAS secrets:
// EXPO_PUBLIC_FIREBASE_API_KEY
// EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
// EXPO_PUBLIC_FIREBASE_APP_ID

export default firebaseConfig;
