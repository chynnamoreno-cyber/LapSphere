import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import baseURL from "./baseurl";
import { getJwtToken } from "./authToken";

/**
 * Check if push token is registered on the backend
 */
export async function checkPushTokenStatus() {
  try {
    const jwt = await getJwtToken();
    if (!jwt) {
      console.log("[pushTokenStatus] No JWT available");
      return null;
    }

    const response = await axios.get(`${baseURL}users/push-token`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    console.log("[pushTokenStatus]", response.data);
    return response.data;
  } catch (error) {
    console.error("[pushTokenStatus] Error:", error.message);
    return null;
  }
}

/**
 * Get locally stored push token info
 */
export async function getLocalPushTokenInfo() {
  try {
    const registered = await AsyncStorage.getItem("registeredPushToken");
    return {
      registered: Boolean(registered),
      tokenPreview: registered ? registered.substring(0, 20) + "..." : null,
    };
  } catch (error) {
    console.error("[getLocalPushTokenInfo] Error:", error.message);
    return { registered: false };
  }
}

/**
 * Log detailed push token debugging info
 */
export async function debugPushTokenStatus() {
  console.log("\n=== Push Token Debug Info ===");
  
  const localInfo = await getLocalPushTokenInfo();
  console.log("Local Storage:", localInfo);

  const backendInfo = await checkPushTokenStatus();
  console.log("Backend Status:", backendInfo);

  console.log("=============================\n");

  return { local: localInfo, backend: backendInfo };
}
