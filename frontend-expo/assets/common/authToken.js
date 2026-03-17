import AsyncStorage from "@react-native-async-storage/async-storage";

const JWT_KEY = "jwt";
const AUTH_TOKEN_DEBUG = false;

let secureStoreModule;

function getSecureStore() {
    if (secureStoreModule !== undefined) return secureStoreModule;

    try {
        // Lazy-load to avoid runtime crash when ExpoSecureStore native module isn't available.
        // eslint-disable-next-line global-require
        secureStoreModule = require("expo-secure-store");
    } catch (_error) {
        secureStoreModule = null;
    }

    return secureStoreModule;
}

function logDebug(message, extra) {
    if (!AUTH_TOKEN_DEBUG) return;
    if (extra !== undefined) {
        console.log(`[authToken] ${message}`, extra);
        return;
    }
    console.log(`[authToken] ${message}`);
}

export async function getJwtToken() {
    try {
        const SecureStore = getSecureStore();
        let secureToken = null;

        if (SecureStore?.getItemAsync) {
            try {
                secureToken = await SecureStore.getItemAsync(JWT_KEY);
                if (secureToken) {
                    logDebug("read success", { exists: true, length: secureToken.length, provider: "secure-store" });
                    return secureToken;
                }
            } catch (_secureReadError) {
                // Fallback to AsyncStorage for unsupported platforms/runtime.
            }
        }

        // One-time migration path from old AsyncStorage location.
        const legacyToken = await AsyncStorage.getItem(JWT_KEY);
        if (legacyToken) {
            if (SecureStore?.setItemAsync) {
                try {
                    await SecureStore.setItemAsync(JWT_KEY, legacyToken);
                    await AsyncStorage.removeItem(JWT_KEY);
                    logDebug("migrated token from AsyncStorage", { length: legacyToken.length });
                } catch (_secureWriteError) {
                    // Keep legacy token in AsyncStorage when SecureStore write isn't available.
                }
            }
            return legacyToken;
        }

        logDebug("read success", { exists: false, provider: SecureStore ? "secure-store" : "async-storage" });
        return null;
    } catch (error) {
        logDebug("read failed", error?.message || "unknown");
        return null;
    }
}

export async function setJwtToken(token) {
    try {
        if (!token) return;
        const value = String(token);
        const SecureStore = getSecureStore();

        if (SecureStore?.setItemAsync) {
            try {
                await SecureStore.setItemAsync(JWT_KEY, value);
                await AsyncStorage.removeItem(JWT_KEY);
                logDebug("write success", { length: value.length, provider: "secure-store" });
                return;
            } catch (_secureWriteError) {
                // Fallback below.
            }
        }

        await AsyncStorage.setItem(JWT_KEY, value);
        logDebug("write success", { length: value.length, provider: "async-storage" });
    } catch (error) {
        logDebug("write failed", error?.message || "unknown");
    }
}

export async function removeJwtToken() {
    try {
        const SecureStore = getSecureStore();
        if (SecureStore?.deleteItemAsync) {
            try {
                await SecureStore.deleteItemAsync(JWT_KEY);
            } catch (_secureDeleteError) {
                // Continue clearing legacy token fallback.
            }
        }
        await AsyncStorage.removeItem(JWT_KEY);
        logDebug("delete success");
    } catch (error) {
        logDebug("delete failed", error?.message || "unknown");
    }
}
