import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Only import SQLite on native platforms, not on web
let SQLite = null;
if (Platform.OS !== "web") {
  SQLite = require("expo-sqlite");
}

// Database instance (lazy-loaded)
let db = null;
let usingSQLite = true; // Flag to track if SQLite is available

// Initialize database
const getDatabase = async () => {
  if (Platform.OS === "web") {
    usingSQLite = false;
    return null; // Web always uses AsyncStorage
  }

  if (!db && usingSQLite && SQLite) {
    try {
      db = await SQLite.openDatabaseAsync("lapsphere_cart.db");
    } catch (error) {
      console.error("[SQLite] Failed to open database, falling back to AsyncStorage:", error);
      usingSQLite = false;
      db = null;
    }
  }
  return db;
};

// Initialize the database schema
export const initCartDatabase = async () => {
  try {
    const database = await getDatabase();
    if (!database) {
      console.log("[SQLite] Using AsyncStorage fallback for cart storage");
      usingSQLite = false;
      return;
    }
    
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      false
    );
    console.log("[SQLite] Cart database initialized successfully");
    usingSQLite = true;
  } catch (error) {
    console.error("[SQLite] Database initialization error:", error);
    console.log("[SQLite] Falling back to AsyncStorage");
    usingSQLite = false;
    db = null;
  }
};

// Fallback AsyncStorage key
const ASYNC_STORAGE_KEY = "lapsphere_cart_items";

// Get all cart items (SQLite with AsyncStorage fallback)
export const getAllCartItems = async () => {
  try {
    const database = await getDatabase();
    
    if (!database || !usingSQLite) {
      // Use AsyncStorage fallback
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (!raw) return [];
      const items = JSON.parse(raw);
      console.log(`[AsyncStorage] Retrieved ${items.length} cart items`);
      return Array.isArray(items) ? items : [];
    }

    // Use SQLite
    const result = await database.getAllAsync("SELECT * FROM cart_items ORDER BY created_at DESC;");

    const items = [];
    for (let i = 0; i < result.length; i++) {
      const row = result[i];
      items.push({
        id: row.product_id,
        product: row.product_id,
        _id: row.product_id,
        name: row.name,
        price: row.price,
        quantity: row.quantity,
        image: row.image,
      });
    }

    console.log(`[SQLite] Retrieved ${items.length} cart items`);
    return items;
  } catch (error) {
    console.error("[getAllCartItems] Error:", error);
    try {
      // Fallback to AsyncStorage
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (!raw) return [];
      const items = JSON.parse(raw);
      console.log(`[AsyncStorage Fallback] Retrieved ${items.length} cart items`);
      return Array.isArray(items) ? items : [];
    } catch (fallbackError) {
      console.error("[getAllCartItems] Fallback error:", fallbackError);
      return [];
    }
  }
};

// Add or update cart item (SQLite with AsyncStorage fallback)
export const addCartItem = async (item) => {
  try {
    const productId = item.product || item.id || item._id;
    if (!productId) {
      throw new Error("Invalid product ID");
    }

    const database = await getDatabase();
    
    if (!database || !usingSQLite) {
      // Use AsyncStorage fallback
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const existingIndex = items.findIndex(i => (i.product || i.id || i._id) === productId);
      if (existingIndex >= 0) {
        items[existingIndex].quantity += (item.quantity || 1);
        console.log(`[AsyncStorage] Updated quantity for ${item.name} to ${items[existingIndex].quantity}`);
      } else {
        items.push({
          product: productId,
          id: productId,
          _id: productId,
          name: item.name || "",
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || "",
        });
        console.log(`[AsyncStorage] Added new item: ${item.name}`);
      }
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(items));
      return;
    }

    // Use SQLite
    const existing = await database.getFirstAsync(
      "SELECT quantity FROM cart_items WHERE product_id = ?;",
      [productId]
    );

    if (existing) {
      const newQuantity = existing.quantity + (item.quantity || 1);
      await database.runAsync(
        "UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?;",
        [newQuantity, productId]
      );
      console.log(`[SQLite] Updated quantity for ${item.name} to ${newQuantity}`);
    } else {
      await database.runAsync(
        "INSERT INTO cart_items (product_id, name, price, quantity, image) VALUES (?, ?, ?, ?, ?);",
        [
          productId,
          item.name || "",
          item.price || 0,
          item.quantity || 1,
          item.image || "",
        ]
      );
      console.log(`[SQLite] Added new item: ${item.name}`);
    }
  } catch (error) {
    console.error("[addCartItem] Error:", error);
    try {
      // Fallback to AsyncStorage
      const productId = item.product || item.id || item._id;
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const existingIndex = items.findIndex(i => (i.product || i.id || i._id) === productId);
      if (existingIndex >= 0) {
        items[existingIndex].quantity += (item.quantity || 1);
      } else {
        items.push({
          product: productId,
          id: productId,
          _id: productId,
          name: item.name || "",
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || "",
        });
      }
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(items));
      console.log("[AsyncStorage Fallback] Item added/updated");
    } catch (fallbackError) {
      console.error("[addCartItem] Fallback error:", fallbackError);
    }
  }
};

// Update cart item quantity (SQLite with AsyncStorage fallback)
export const updateCartItemQuantity = async (productId, quantity) => {
  try {
    if (quantity <= 0) {
      await removeCartItem(productId);
      return;
    }

    const database = await getDatabase();
    
    if (!database || !usingSQLite) {
      // Use AsyncStorage fallback
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const index = items.findIndex(i => (i.product || i.id || i._id) === productId);
      if (index >= 0) {
        items[index].quantity = quantity;
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(items));
        console.log(`[AsyncStorage] Updated quantity for product ${productId} to ${quantity}`);
      }
      return;
    }

    // Use SQLite
    await database.runAsync(
      "UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?;",
      [quantity, productId]
    );
    console.log(`[SQLite] Updated quantity for product ${productId} to ${quantity}`);
  } catch (error) {
    console.error("[updateCartItemQuantity] Error:", error);
    try {
      // Fallback to AsyncStorage
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const index = items.findIndex(i => (i.product || i.id || i._id) === productId);
      if (index >= 0) {
        items[index].quantity = quantity;
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(items));
      }
    } catch (fallbackError) {
      console.error("[updateCartItemQuantity] Fallback error:", fallbackError);
    }
  }
};

// Remove cart item (SQLite with AsyncStorage fallback)
export const removeCartItem = async (productId) => {
  try {
    const database = await getDatabase();
    
    if (!database || !usingSQLite) {
      // Use AsyncStorage fallback
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const filtered = items.filter(i => (i.product || i.id || i._id) !== productId);
      if (filtered.length < items.length) {
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(filtered));
        console.log(`[AsyncStorage] Removed item with product_id: ${productId}`);
      }
      return;
    }

    // Use SQLite
    await database.runAsync(
      "DELETE FROM cart_items WHERE product_id = ?;",
      [productId]
    );
    console.log(`[SQLite] Removed item with product_id: ${productId}`);
  } catch (error) {
    console.error("[removeCartItem] Error:", error);
    try {
      // Fallback to AsyncStorage
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const filtered = items.filter(i => (i.product || i.id || i._id) !== productId);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(filtered));
    } catch (fallbackError) {
      console.error("[removeCartItem] Fallback error:", fallbackError);
    }
  }
};

// Clear all cart items (SQLite with AsyncStorage fallback)
export const clearCart = async () => {
  try {
    const database = await getDatabase();
    
    if (!database || !usingSQLite) {
      // Use AsyncStorage fallback
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify([]));
      console.log("[AsyncStorage] Cart cleared");
      return;
    }

    // Use SQLite
    await database.execAsync("DELETE FROM cart_items;", false);
    console.log("[SQLite] Cart cleared");
  } catch (error) {
    console.error("[clearCart] Error:", error);
    try {
      // Fallback to AsyncStorage
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify([]));
      console.log("[AsyncStorage Fallback] Cart cleared");
    } catch (fallbackError) {
      console.error("[clearCart] Fallback error:", fallbackError);
    }
  }
};

// Get total cart quantity (SQLite with AsyncStorage fallback)
export const getCartTotalQuantity = async () => {
  try {
    const database = await getDatabase();
    
    if (!database || !usingSQLite) {
      // Use AsyncStorage fallback
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const total = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      console.log(`[AsyncStorage] Cart total quantity: ${total}`);
      return total;
    }

    // Use SQLite
    const result = await database.getFirstAsync(
      "SELECT SUM(quantity) as total FROM cart_items;"
    );

    const total = result?.total || 0;
    console.log(`[SQLite] Cart total quantity: ${total}`);
    return total;
  } catch (error) {
    console.error("[getCartTotalQuantity] Error:", error);
    try {
      // Fallback to AsyncStorage
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const total = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      console.log(`[AsyncStorage Fallback] Cart total quantity: ${total}`);
      return total;
    } catch (fallbackError) {
      console.error("[getCartTotalQuantity] Fallback error:", fallbackError);
      return 0;
    }
  }
};

// Get cart item by product ID (SQLite with AsyncStorage fallback)
export const getCartItem = async (productId) => {
  try {
    const database = await getDatabase();
    
    if (!database || !usingSQLite) {
      // Use AsyncStorage fallback
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const item = items.find(i => (i.product || i.id || i._id) === productId);
      if (item) {
        console.log(`[AsyncStorage] Found cart item: ${item.name}`);
        return {
          id: item.product || item.id || item._id,
          product: item.product || item.id || item._id,
          _id: item.product || item.id || item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        };
      }
      return null;
    }

    // Use SQLite
    const result = await database.getFirstAsync(
      "SELECT * FROM cart_items WHERE product_id = ?;",
      [productId]
    );

    if (result) {
      console.log(`[SQLite] Found cart item: ${result.name}`);
      return {
        id: result.product_id,
        product: result.product_id,
        _id: result.product_id,
        name: result.name,
        price: result.price,
        quantity: result.quantity,
        image: result.image,
      };
    }

    return null;
  } catch (error) {
    console.error("[getCartItem] Error:", error);
    try {
      // Fallback to AsyncStorage
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      
      const item = items.find(i => (i.product || i.id || i._id) === productId);
      if (item) {
        console.log(`[AsyncStorage Fallback] Found cart item: ${item.name}`);
        return {
          id: item.product || item.id || item._id,
          product: item.product || item.id || item._id,
          _id: item.product || item.id || item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        };
      }
      return null;
    } catch (fallbackError) {
      console.error("[getCartItem] Fallback error:", fallbackError);
      return null;
    }
  }
};

export default {
  initCartDatabase,
  getAllCartItems,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  getCartTotalQuantity,
  getCartItem,
};
