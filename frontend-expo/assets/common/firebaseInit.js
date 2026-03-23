/**
 * Firebase Initialization Module
 * For development/Expo testing: Firebase is DISABLED
 * Firebase can causeToken issues on Android with Expo
 * For production builds, configure Firebase properly via google-services.json
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

let isInitialized = false;
let firebaseApp = null;

export const initializeFirebase = async () => {
  if (isInitialized) {
    console.log('[Firebase] Already initialized (skipped)');
    return null;
  }

  // Firebase is disabled for Expo/development to avoid native conflicts
  // Use Expo notifications instead for push notifications
  console.log('[Firebase] Firebase disabled for development (using Expo notifications)');
  
  isInitialized = true;
  return null;
};

/**
 * Get Firebase app instance - returns null (Firebase disabled)
 */
export const getFirebaseApp = () => {
  return null;
};

/**
 * Safe auth getter - returns null (Firebase disabled)
 */
export const getFirebaseAuth = async () => {
  return null;
};

/**
 * Safe Firestore getter - returns null (Firebase disabled)
 */
export const getFirebaseFirestore = async () => {
  return null;
};

/**
 * Safe Storage getter - returns null (Firebase disabled)
 */
export const getFirebaseStorage = async () => {
  return null;
};

/**
 * Check if Firebase is available - always false in dev
 */
export const isFirebaseAvailable = () => {
  return false;
};

export default initializeFirebase;
