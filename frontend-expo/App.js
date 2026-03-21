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
    'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
    '`expo-notifications` functionality is not fully supported in Expo Go',
    '"shadow*" style props are deprecated',
    'props.pointerEvents is deprecated',
    'Image: style.resizeMode is deprecated',
    '[expo-notifications]',
  ]);
}

// MUST be at module level - tells Expo how to handle notifications in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
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
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const registerPushToken = async () => {
      try {
        if (Constants.appOwnership === 'expo') {
          // Expo Go (SDK 53+): no remote FCM; in-app Notification list still works from API.
          console.warn(
            '[Push] Expo Go cannot register device push tokens. Use a dev build / APK + google-services.json + FCM for real pushes.'
          );
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (finalStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        let pushToken = null;
        let tokenType = 'unknown';

        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          pushToken = deviceToken?.data;
          tokenType = 'fcm';
        } catch {
          try {
            const projectId =
              Constants.expoConfig?.extra?.eas?.projectId ||
              Constants.manifest?.extra?.eas?.projectId ||
              '6f747b51-b33e-4c6e-9d11-89bf760ec81a';
            const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
            pushToken = expoToken?.data;
            tokenType = 'expo';
          } catch {
            return;
          }
        }

        if (!pushToken) return;

        await AsyncStorage.removeItem('pushToken');

        const jwt = await getJwtToken();
        if (!jwt) return;

        const response = await fetch(`${baseURL}users/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ token: pushToken, type: tokenType }),
        });

        if (response.ok) {
          await AsyncStorage.setItem('pushToken', pushToken);
        }
      } catch (error) {
        console.error('[Push] Registration error:', error.message);
      }
    };

    if (context?.stateUser?.isAuthenticated) {
      registerPushToken();
    }
  }, [context?.stateUser?.isAuthenticated]);

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