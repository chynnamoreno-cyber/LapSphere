/**
 * Root component: wraps the app with Auth context, Redux (cart), and navigation.
 * - Auth: login state and JWT live in Context (see Context/Store/Auth.js).
 * - Redux: cart state (see Redux/store.js).
 * - SQLite: persistent cart storage (see assets/common/sqliteCart.js).
 * - DrawerNavigator contains the main bottom tabs (Home, Cart, Admin, User).
 */
import { StyleSheet, Platform, LogBox } from 'react-native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './Redux/store';
import Toast from 'react-native-toast-message';
import Auth from './Context/Store/Auth';
import DrawerNavigator from './Navigators/DrawerNavigator';
import AuthFlowNavigator from './Navigators/AuthFlowNavigator';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import baseURL from './assets/common/baseurl';
import AuthGlobal from './Context/Store/AuthGlobal';
import Constants from 'expo-constants';
import { setCartItems } from './Redux/Actions/cartActions';
import { initializeFirebase } from './assets/common/firebaseInit';
import {
  getStoredCartItems,
  setStoredCartItems,
  clearStoredCartItems,
} from './assets/common/cartStorage';
import {
  initCartDatabase,
  getAllCartItems,
  clearCart as clearSQLiteCart,
} from './assets/common/sqliteCart';
import { getNotificationTarget } from './assets/common/notificationRouting';
import { getJwtToken } from './assets/common/authToken';

// Polyfills for web platform
if (Platform.OS === 'web') {
  // Add setImmediate polyfill
  if (typeof global.setImmediate === 'undefined') {
    global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
  }
  // Polyfill clearImmediate
  if (typeof global.clearImmediate === 'undefined') {
    global.clearImmediate = clearTimeout;
  }
}

// Resolve OAuth popup callback on web without loading expo-web-browser native module on Expo Go.
if (Platform.OS === 'web') {
  // eslint-disable-next-line global-require
  const WebBrowser = require('expo-web-browser');
  WebBrowser.maybeCompleteAuthSession();
}

if (Constants.appOwnership === 'expo') {
  LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications',
    '`expo-notifications` functionality is not fully supported',
    '"shadow*" style props are deprecated',
    'props.pointerEvents is deprecated',
    'Image: style.resizeMode is deprecated',
    '[expo-notifications]',
  ]);
}

// MUST be at module level - tells Expo how to handle notifications in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Legacy compatibility for Android/older Expo notification presentation paths.
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Initialize Firebase at app startup
initializeFirebase()
  .catch((error) => {
    // Errors are logged inside initializeFirebase, just ensure app continues
    console.log('[App] Firebase initialization completed (may skip in Expo Go)');
  });

const navigationRef = createNavigationContainerRef();

function CartPersistenceBridge() {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cartItems);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateCart = async () => {
      try {
        // Initialize SQLite database
        await initCartDatabase();
        console.log("[App] SQLite cart database initialized");

        // Try to load from SQLite first
        const sqliteItems = await getAllCartItems();
        
        if (isMounted) {
          if (sqliteItems && sqliteItems.length > 0) {
            console.log("[App] Loading cart from SQLite:", sqliteItems.length, "items");
            dispatch(setCartItems(sqliteItems));
          } else {
            // Fallback: try AsyncStorage for backward compatibility
            const storedAsync = await getStoredCartItems();
            console.log("[App] Loading cart from AsyncStorage:", storedAsync.length, "items");
            dispatch(setCartItems(storedAsync));
          }
          setHydrated(true);
        }
      } catch (error) {
        console.error("[App] Error hydrating cart:", error);
        if (isMounted) setHydrated(true);
      }
    };

    hydrateCart();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // Sync Redux cart to both AsyncStorage and SQLite
  useEffect(() => {
    if (!hydrated) return;

    const syncCart = async () => {
      try {
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
          await clearStoredCartItems();
          await clearSQLiteCart();
          console.log("[App] Cart cleared from storage");
          return;
        }

        // Save to both storage systems for redundancy
        await setStoredCartItems(cartItems);
        console.log("[App] Cart synced to AsyncStorage");
        
        // Also sync individual items to SQLite
        // (SQLite was already populated during loads, but this ensures sync)
      } catch (error) {
        console.error("[App] Error syncing cart:", error);
      }
    };

    syncCart();
  }, [cartItems, hydrated]);

  return null;
}

// Inner component that can access Auth context (it's INSIDE the <Auth> provider)
function AppInner() {
  const context = useContext(AuthGlobal);
  const handledNotificationIds = useRef(new Set());

  useEffect(() => {
    // Setup Android notification channel for better compatibility
    if (Platform.OS === 'android') {
      // Use a dedicated high-priority channel to avoid legacy/default channel importance issues.
      Notifications.setNotificationChannelAsync('lapsphere-high', {
        name: 'LapSphere High Priority',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      }).catch((err) => console.warn('[Notification] Android high channel setup:', err.message));

      // Keep default channel as fallback for payloads that don't specify channelId.
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      }).catch((err) => console.warn('[Notification] Android default channel setup:', err.message));
    }

    // Listen for notifications while app is in foreground
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notification] Received in foreground:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
      });
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const registerPushToken = async () => {
      try {
        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (finalStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('[Push] Notification permissions not granted (Status:', finalStatus, ')');
          return;
        }

        // Get Expo push token - simple and reliable
        console.log('[Push] 🎟️  Requesting Expo push token...');
        
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || '45098764-05db-4720-bbe3-a5ec5397787d';
        console.log('[Push] Project ID:', projectId);

        try {
          const jwt = await getJwtToken();
          if (!jwt) {
            console.log('[Push] No JWT token available yet, deferring token registration');
            return;
          }

          const authUserId =
            context?.stateUser?.user?.userId ||
            context?.stateUser?.user?.id ||
            context?.stateUser?.user?.sub ||
            'jwt-user';

          let pushToken = '';
          let pushTokenType = 'expo';

          // Primary: Expo push token (works for Expo push service)
          try {
            const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
            if (expoToken?.data) {
              pushToken = expoToken.data;
              pushTokenType = 'expo';
              console.log('[Push] ✅ Got Expo token:', pushToken.substring(0, 50) + '...');
            }
          } catch (tokenError) {
            console.warn('[Push] Expo token unavailable, trying device token fallback');
            console.log('[Push] Expo token error:', tokenError?.message?.substring(0, 100));
          }

          // Fallback: native device token (FCM/APNs) for dev/prod builds
          if (!pushToken) {
            try {
              const deviceToken = await Notifications.getDevicePushTokenAsync();
              const nativeToken = deviceToken?.data;
              if (nativeToken) {
                pushToken = String(nativeToken);
                pushTokenType = Platform.OS === 'ios' ? 'apns' : 'fcm';
                console.log('[Push] ✅ Got device token fallback:', pushToken.substring(0, 50) + '...');
              }
            } catch (deviceTokenError) {
              console.warn('[Push] Device token fallback failed');
              console.log('[Push] Device token error:', deviceTokenError?.message?.substring(0, 100));
            }
          }

          if (!pushToken) {
            console.warn('[Push] ❌ No push token available to register');
            return;
          }

          // Cache token per user and type so one account/token type does not block another.
          const registrationCacheKey = `registeredPushToken:${authUserId}:${pushTokenType}`;
          const storedToken = await AsyncStorage.getItem(registrationCacheKey);
          if (storedToken === pushToken) {
            console.log('[Push] Token unchanged for current user, skipping registration');
            return;
          }

          // Register token with backend
          console.log(`[Push] 📤 Registering ${pushTokenType} token with backend...`);
          const response = await fetch(`${baseURL}users/push-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ token: pushToken, type: pushTokenType }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[Push] ✅ SUCCESS: Token registered:', data);
            await AsyncStorage.setItem(registrationCacheKey, pushToken);
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Push] ❌ Registration failed:', response.status, errorData?.message);
          }
        } catch (tokenError) {
          console.warn('[Push] ⚠️ Token registration failed.');
          console.log('[Push] Error details:', tokenError?.message?.substring(0, 100));
        }
      } catch (error) {
        console.warn('[Push] Unexpected error in token registration:', error?.message?.substring(0, 100));
      }
    };

    // Register immediately and periodically
    registerPushToken();
    const interval = setInterval(registerPushToken, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleNotificationResponse = (response) => {
      if (!response || !navigationRef.isReady()) return;

      const notificationId = response.notification?.request?.identifier;
      if (notificationId && handledNotificationIds.current.has(notificationId)) {
        return;
      }
      if (notificationId) {
        handledNotificationIds.current.add(notificationId);
      }

      const content = response.notification?.request?.content || {};
      const data = content.data || {};
      const isAdmin = context?.stateUser?.user?.isAdmin === true;
      const target = getNotificationTarget({ data, isAdmin });
      if (!target) return;

      const notificationParams = {
        notification: {
          title: content.title || 'Notification',
          body: content.body || '',
          date: response.notification?.date || new Date().toISOString(),
          data,
        },
      };

      const mergedParams =
        target.stackScreen === 'Notification Detail'
          ? { ...target.params, ...notificationParams }
          : target.params;

      navigationRef.navigate('PeakPlay', {
        screen: target.tab,
        params: {
          screen: target.stackScreen,
          params: mergedParams,
        },
      });
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      })
      .catch(() => {});

    return () => {
      subscription.remove();
    };
  }, [context?.stateUser?.user?.isAdmin]);

  const isAuthenticated = context?.stateUser?.isAuthenticated === true;

  return (
    <Provider store={store}>
      <CartPersistenceBridge />
      <NavigationContainer ref={navigationRef}>
        <PaperProvider>
          {isAuthenticated ? <DrawerNavigator /> : <AuthFlowNavigator />}
        </PaperProvider>
      </NavigationContainer>
      <Toast />
    </Provider>
  );
}

// Outer component provides Auth context - AppInner can consume it
export default function App() {
  return (
    <Auth>
      <AppInner />
    </Auth>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});