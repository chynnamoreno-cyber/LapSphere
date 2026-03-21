import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
    CHANGE_CART_ITEM_QUANTITY,
    SET_CART_ITEMS,
} from '../constants';
import { 
    addCartItem, 
    removeCartItem, 
    clearCart as clearSQLiteCart,
    updateCartItemQuantity 
} from '../../assets/common/sqliteCart';

export const addToCart = (payload) => {
    // Sync to SQLite in background
    addCartItem(payload).catch(error => {
        console.error("[Thunk] Error adding cart item to SQLite:", error);
    });
    
    return { type: ADD_TO_CART, payload };
};

export const removeFromCart = (payload) => {
    // Sync to SQLite in background
    const productId = payload.product || payload.id || payload._id;
    if (productId) {
        removeCartItem(productId).catch(error => {
            console.error("[Thunk] Error removing cart item from SQLite:", error);
        });
    }
    
    return { type: REMOVE_FROM_CART, payload };
};

export const changeCartItemQuantity = (payload) => {
    // payload: { itemId, delta } or { itemId, quantity }
    // Sync to SQLite in background
    const { itemId, quantity, delta } = payload;
    const productId = itemId;
    
    if (productId && quantity !== undefined) {
        updateCartItemQuantity(productId, quantity).catch(error => {
            console.error("[Thunk] Error updating cart item quantity in SQLite:", error);
        });
    }
    
    return { type: CHANGE_CART_ITEM_QUANTITY, payload };
};

export const clearCart = () => {
    // Sync to SQLite in background
    clearSQLiteCart().catch(error => {
        console.error("[Thunk] Error clearing cart from SQLite:", error);
    });
    
    return { type: CLEAR_CART };
};

export const setCartItems = (payload) => {
    return { type: SET_CART_ITEMS, payload };
};
