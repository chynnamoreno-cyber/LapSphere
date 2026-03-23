/**
 * [MP2] Google sign-in button.
 * Button only renders when client IDs are set in assets/common/socialAuth.js
 *
 * Redirect URI strategy:
 * Web (localhost): makeRedirectUri() => http://localhost:8081
 * Expo Go: https://auth.expo.io/@owner/slug
 * APK / standalone: com.peakplay.itcp239://
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { loginWithGoogle, loginWithGoogleIdToken } from '../Context/Actions/Auth.actions';
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_EXPO_CLIENT_ID,
} from '../assets/common/socialAuth';

WebBrowser.maybeCompleteAuthSession();

const IS_WEB = Platform.OS === 'web';
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const IS_EXPO_GO_NATIVE = IS_EXPO_GO && !IS_WEB;

function buildRedirectUri() {
  if (IS_WEB) {
    return makeRedirectUri();
  }

  if (IS_EXPO_GO) {
    const owner = Constants.expoConfig?.owner;
    const slug = Constants.expoConfig?.slug;
    if (owner && slug) {
      return `https://auth.expo.io/@${owner}/${slug}`;
    }
    return makeRedirectUri();
  }

  // Dev build / APK: force Google reverse-client redirect URI format.
  const androidClient = GOOGLE_ANDROID_CLIENT_ID || '';
  const clientPrefix = androidClient.split('.apps.googleusercontent.com')[0];
  if (clientPrefix) {
    const reverseScheme = `com.googleusercontent.apps.${clientPrefix}`;
    return makeRedirectUri({ native: `${reverseScheme}:/oauthredirect` });
  }

  return undefined;
}

function GoogleLoginButton({ dispatch, variant }) {
  const loggedPlatform = React.useRef(false);
  const loggedRequest = React.useRef(false);

  const redirectUri = React.useMemo(() => buildRedirectUri(), []);

  const requestConfig = React.useMemo(
    () => ({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      expoClientId: GOOGLE_EXPO_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
      // expo-auth-session requires androidClientId on Android even in Expo Go.
      androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      selectAccount: true,
      redirectUri: IS_EXPO_GO ? redirectUri : redirectUri,
    }),
    [redirectUri]
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(requestConfig);

  React.useEffect(() => {
    if (!loggedPlatform.current) {
      console.log(
        '[GoogleAuth] platform:', Platform.OS,
        '| ownership:', Constants.appOwnership,
        '| redirectUri:', redirectUri,
      );
      loggedPlatform.current = true;
    }
  }, []);

  React.useEffect(() => {
    if (!loggedRequest.current && request) {
      console.log(
        '[GoogleAuth] request ready | clientId:', requestConfig.androidClientId,
        '| requestRedirect:', request.redirectUri,
        '| authUrl:', request.url,
      );
      loggedRequest.current = true;
    }
  }, [request, requestConfig.androidClientId]);

  React.useEffect(() => {
    if (!response) return;

    console.log('[GoogleAuth] response type:', response.type);
    console.log('[GoogleAuth] response params:', response.params);
    console.log('[GoogleAuth] response authentication:', response.authentication);

    if (response.type !== 'success') return;

    const idToken = response?.params?.id_token || response?.authentication?.idToken;
    if (!idToken) {
      console.log('[GoogleAuth] No idToken in success response (waiting for async completion)');
      // Native flow may first return only `code`, then update with exchanged id_token.
      return;
    }

    console.log('[GoogleAuth] idToken found, calling loginWithGoogleIdToken');
    loginWithGoogleIdToken(idToken, dispatch);
  }, [response, dispatch]);

  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[
        styles.socialButton,
        isOutline ? styles.outlineButton : styles.googleButton,
      ]}
      onPress={() => loginWithGoogle(promptAsync, dispatch, { isExpoGoNative: IS_EXPO_GO_NATIVE })}
      disabled={!request || IS_EXPO_GO_NATIVE}
    >
      <Ionicons
        name="logo-google"
        size={22}
        color={isOutline ? '#000' : '#fff'}
      />
      <Text
        style={[styles.socialButtonText, isOutline && styles.outlineButtonText]}
      >
        Continue with Google
      </Text>
    </TouchableOpacity>
  );
}

export default function SocialLoginButtons({ dispatch, variant }) {
  if (!GOOGLE_WEB_CLIENT_ID) return null;

  return (
    <View style={styles.socialSection}>
      <View style={styles.socialButtons}>
        <GoogleLoginButton dispatch={dispatch} variant={variant} />
      </View>
      {IS_EXPO_GO_NATIVE ? (
        <Text style={styles.helperText}>
          Google sign-in is not supported in Expo Go on SDK 53+. Use a development build or APK.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  socialSection: { marginBottom: 0 },
  socialButtons: { flexDirection: 'column', gap: 12 },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  outlineButton: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  googleButton: { backgroundColor: '#db4437' },
  socialButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineButtonText: { color: '#000' },
  helperText: { marginTop: 8, color: '#666', fontSize: 12, textAlign: 'center' },
});