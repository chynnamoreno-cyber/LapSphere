import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message';
import baseURL from '../../assets/common/baseurl';
import { getJwtToken, setJwtToken, removeJwtToken } from '../../assets/common/authToken';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SET_CURRENT_USER = 'SET_CURRENT_USER';

const AUTH_REQUEST_TIMEOUT_MS = 60000;
const HEALTHCHECK_TIMEOUT_MS = 20000;

function isRenderHost(url) {
  return String(url || '').includes('.onrender.com/');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function warmUpBackendIfNeeded() {
  if (!isRenderHost(baseURL)) return;

  const healthUrl = `${baseURL}health`;
  try {
    await fetchWithTimeout(healthUrl, { method: 'GET' }, HEALTHCHECK_TIMEOUT_MS);
  } catch (error) {
    // Ignore warm-up failure and proceed to auth request.
    console.log('[socialAuth] Render warm-up skipped:', error?.message || error);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function handleSocialAuthResponse(res, responseText, dispatch) {
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {
      message: `Unexpected response (${res.status}): ${responseText?.slice(0, 140) || 'empty body'}`,
    };
  }

  console.log('[socialAuth] backend status:', res.status, data?.message || 'ok');

  if (res.ok && data.token) {
    await setJwtToken(data.token);
    const decoded = jwtDecode(data.token);
    dispatch(setCurrentUser(decoded));
  } else {
    Toast.show({
      topOffset: 60,
      type: 'error',
      text1: data.message || 'Sign-in failed',
      text2: '',
    });
    dispatch(setCurrentUser({}));
  }
}

// ─── Google sign-in ──────────────────────────────────────────────────────────

/**
 * [MP2] Calls the Google OAuth prompt then POSTs the id_token to the backend.
 *
 * IMPORTANT:
 *   - Expo Go uses auth.expo.io proxy redirect for Google OAuth.
 *   - Web and standalone builds use their normal platform redirect flow.
 */
export const loginWithGoogle = async (promptAsync, dispatch, options = {}) => {
  try {
    if (options?.isExpoGoNative) {
      Toast.show({
        topOffset: 60,
        type: 'info',
        text1: 'Google sign-in needs a development build',
        text2: 'Expo Go (SDK 53+) does not fully support this flow.',
      });
      return;
    }

    const result = await promptAsync();

    // Targeted log: result type + whether we got a token
    console.log(
      '[loginWithGoogle] result type:', result?.type,
      '| params keys:', Object.keys(result?.params || {}),
    );

    // On native, promptAsync can return success with only `code`.
    // The hook response is completed asynchronously with `id_token`.
    if (result?.type === 'cancel' || result?.type === 'dismiss') return;
    if (result?.type === 'error') {
      Toast.show({
        topOffset: 60,
        type: 'error',
        text1: 'Google sign-in failed',
        text2: result?.error?.message || '',
      });
    }
  } catch (err) {
    console.error('[loginWithGoogle]', err);
    Toast.show({
      topOffset: 60,
      type: 'error',
      text1: 'Google sign-in failed',
      text2: err.message,
    });
    dispatch(setCurrentUser({}));
  }
};

export const loginWithGoogleIdToken = async (idToken, dispatch) => {
  try {
    if (!idToken) {
      console.log('[loginWithGoogleIdToken] No idToken provided');
      return;
    }

    console.log('[loginWithGoogleIdToken] Using backend URL:', baseURL);
    console.log('[loginWithGoogleIdToken] Sending idToken to backend');

    await warmUpBackendIfNeeded();

    const requestUrl = `${baseURL}users/auth/google`;
    let res;
    try {
      res = await fetchWithTimeout(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
    } catch (firstError) {
      // One retry helps when Render wakes up right after the first timeout.
      console.log('[loginWithGoogleIdToken] First attempt failed, retrying once:', firstError?.message || firstError);
      res = await fetchWithTimeout(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
    }

    console.log('[loginWithGoogleIdToken] Backend response status:', res.status);

    const responseText = await res.text();
    console.log('[loginWithGoogleIdToken] Backend response body:', responseText.slice(0, 200));

    await handleSocialAuthResponse(res, responseText, dispatch);
  } catch (err) {
    console.error('[loginWithGoogleIdToken] Error:', err.message, err);

    let errorMessage = err.message;
    if (err.message === 'Network request failed' || err instanceof TypeError) {
      errorMessage = `Cannot reach backend at ${baseURL}. Make sure:\n1. Render is live\n2. You installed the latest APK\n3. Internet is available on your phone`;
    } else if (err.name === 'AbortError') {
      errorMessage = 'Backend request timed out. Render may be waking up; wait 15-30 seconds and try again.';
    }

    Toast.show({
      topOffset: 60,
      type: 'error',
      text1: 'Google sign-in failed',
      text2: errorMessage,
    });
    dispatch(setCurrentUser({}));
  }
};

// ─── Standard auth ───────────────────────────────────────────────────────────

export const loginUser = (user, dispatch) => {
  return fetch(`${baseURL}users/login`, {
    method: 'POST',
    body: JSON.stringify(user),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json())
    .then(async (data) => {
      if (data) {
        const token = data.token;
        await setJwtToken(token);
        const decoded = jwtDecode(token);
        dispatch(setCurrentUser(decoded, user));
      } else {
        logoutUser(dispatch);
      }
    })
    .catch((err) => {
      Toast.show({
        topOffset: 60,
        type: 'error',
        text1: 'Please provide correct credentials',
        text2: '',
      });
      console.log(err);
      logoutUser(dispatch);
    });
};

export const getUserProfile = (id) => {
  fetch(`${baseURL}users/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  })
    .then((res) => res.json())
    .then((data) => console.log(data));
};

export const logoutUser = async (dispatch) => {
  try {
    const jwt = await getJwtToken();
    if (jwt) {
      await fetch(`${baseURL}users/push-token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }).catch(() => {});
    }

    const keys = await AsyncStorage.getAllKeys();
    const pushCacheKeys = keys.filter((k) => String(k).startsWith('registeredPushToken:'));
    if (pushCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(pushCacheKeys);
    }
  } catch (_error) {
    // Best effort cache cleanup.
  }

  removeJwtToken();
  dispatch(setCurrentUser({}));
};

export const setCurrentUser = (decoded, user) => ({
  type: SET_CURRENT_USER,
  payload: decoded,
  userProfile: user,
});