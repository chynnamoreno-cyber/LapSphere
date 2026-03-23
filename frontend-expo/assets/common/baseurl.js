/**
 * Backend API base URL (must end with /api/v1/ — see trailing slash below).
 *
 * Priority:
 * 1) EXPO_PUBLIC_API_URL in env (e.g. app.config.js `extra` or EAS secrets) — full host only, no /api path
 * 2) expo.extra.apiUrl from app.json
 * 3) Web default: http://localhost:4000
 * 4) Native fallback: update DEFAULT_LAN_HOST to your PC IPv4 (same Wi‑Fi as the phone)
 *
 * Android + HTTP: `app.json` sets usesCleartextTraffic so LAN dev servers work.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_LAN_HOST = "https://lapsphere.onrender.com";

function normalizeHost(url) {
    if (!url || typeof url !== "string") return null;
    const t = url.trim().replace(/\/+$/, "");
    return t || null;
}

const fromEnv =
    (typeof process !== "undefined" && process.env && process.env.EXPO_PUBLIC_API_URL) || "";
const fromExtra =
    Constants.expoConfig?.extra?.apiUrl ||
    Constants.expoConfig?.extra?.BACKEND_HOST ||
    Constants.manifest?.extra?.apiUrl ||
    Constants.manifest?.extra?.BACKEND_HOST ||
    "";

const resolvedHost =
    normalizeHost(fromEnv) ||
    normalizeHost(fromExtra) ||
    (Platform.OS === "web" ? "http://localhost:4000" : DEFAULT_LAN_HOST);

const baseURL = `${resolvedHost}/api/v1/`;

export default baseURL;
