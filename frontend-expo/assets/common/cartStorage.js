import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DB_NAME = "peakplay.db";
const KEY_CART_ITEMS = "cartItems";

let dbPromise = null;
let initialized = false;
let sqliteModule;

function getSQLite() {
    if (sqliteModule !== undefined) return sqliteModule;

    if (Platform.OS === "web") {
        sqliteModule = null;
        return sqliteModule;
    }

    try {
        // Lazy-load so web bundling won't pull in expo-sqlite web worker/wasm.
        // eslint-disable-next-line global-require
        sqliteModule = require("expo-sqlite");
    } catch (_error) {
        sqliteModule = null;
    }

    return sqliteModule;
}

async function getDb() {
    const SQLite = getSQLite();
    if (!SQLite?.openDatabaseAsync) return null;

    if (!dbPromise) {
        dbPromise = SQLite.openDatabaseAsync(DB_NAME);
    }
    const db = await dbPromise;

    if (!initialized) {
        await db.execAsync(
            `CREATE TABLE IF NOT EXISTS app_storage (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT
            );`
        );
        initialized = true;
    }

    return db;
}

export async function getStoredCartItems() {
    try {
        const db = await getDb();
        if (!db) {
            const raw = await AsyncStorage.getItem(KEY_CART_ITEMS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }

        const row = await db.getFirstAsync(
            "SELECT value FROM app_storage WHERE key = ? LIMIT 1",
            [KEY_CART_ITEMS]
        );

        if (!row?.value) return [];
        const parsed = JSON.parse(row.value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

export async function setStoredCartItems(items) {
    const safeItems = Array.isArray(items) ? items : [];
    const serialized = JSON.stringify(safeItems);

    const db = await getDb();
    if (!db) {
        await AsyncStorage.setItem(KEY_CART_ITEMS, serialized);
        return;
    }

    await db.runAsync(
        `INSERT INTO app_storage (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        [KEY_CART_ITEMS, serialized]
    );
}

export async function clearStoredCartItems() {
    const db = await getDb();
    if (!db) {
        await AsyncStorage.removeItem(KEY_CART_ITEMS);
        return;
    }

    await db.runAsync("DELETE FROM app_storage WHERE key = ?", [KEY_CART_ITEMS]);
}
