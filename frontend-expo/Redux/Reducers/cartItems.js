import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
    CHANGE_CART_ITEM_QUANTITY,
    SET_CART_ITEMS,
} from '../constants';

function getItemId(item) {
    if (!item) return "";
    return String(item.id || item._id || item.product?.id || item.product?._id || "");
}

const cartItems = (state = [], action) => {
    switch (action.type) {
        case ADD_TO_CART:
            return (() => {
                const payload = action.payload || {};
                const itemId = getItemId(payload);
                if (!itemId) return [...state, payload];

                const qtyToAdd = Number(payload.quantity || 1);
                const next = state.map((cartItem) => {
                    const cartId = getItemId(cartItem);
                    if (cartId !== itemId) return cartItem;

                    const currentQty = Number(cartItem.quantity || 1);
                    const countInStock = Number(cartItem.countInStock || payload.countInStock || 0);
                    const hasStockLimit = Number.isFinite(countInStock) && countInStock > 0;
                    const desired = currentQty + qtyToAdd;
                    const capped = hasStockLimit ? Math.min(desired, countInStock) : desired;

                    return {
                        ...cartItem,
                        ...payload,
                        quantity: Math.max(1, capped),
                    };
                });

                const exists = next.some((c) => getItemId(c) === itemId);
                if (exists) return next;

                return [
                    ...state,
                    {
                        ...payload,
                        quantity: Math.max(1, qtyToAdd),
                    },
                ];
            })();
        case REMOVE_FROM_CART:
            return state.filter((cartItem) => getItemId(cartItem) !== getItemId(action.payload));
        case CHANGE_CART_ITEM_QUANTITY: {
            const { itemId, delta, quantity } = action.payload || {};
            const id = String(itemId || "");
            if (!id) return state;

            // Support both delta (relative) and quantity (absolute) updates
            const hasQtyChange = quantity !== undefined && quantity !== null;
            const hasDeltaChange = delta !== undefined && delta !== null && delta !== 0;
            
            if (!hasQtyChange && !hasDeltaChange) return state;

            return state
                .map((cartItem) => {
                    if (getItemId(cartItem) !== id) return cartItem;

                    let newQty;
                    if (hasQtyChange) {
                        // Direct quantity set
                        newQty = Math.max(1, Number(quantity));
                    } else {
                        // Delta change
                        const currentQty = Number(cartItem.quantity || 1);
                        const d = Number(delta || 0);
                        newQty = currentQty + d;
                    }

                    const countInStock = Number(cartItem.countInStock || 0);
                    const hasStockLimit = Number.isFinite(countInStock) && countInStock > 0;

                    const clamped = hasStockLimit ? Math.min(newQty, countInStock) : newQty;

                    return { ...cartItem, quantity: Math.max(1, clamped) };
                })
                .filter((cartItem) => Number(cartItem.quantity || 0) > 0);
        }
        case CLEAR_CART:
            return (state = []);
        case SET_CART_ITEMS:
            return Array.isArray(action.payload)
                ? action.payload.reduce((acc, item) => {
                    const qty = Math.max(1, Number(item.quantity || 1));
                    const id = getItemId(item);
                    if (!id) return acc;

                    const existing = acc.find((x) => getItemId(x) === id);
                    if (!existing) {
                        acc.push({ ...item, quantity: qty });
                        return acc;
                    }

                    const nextQty = Number(existing.quantity || 1) + qty;
                    const countInStock = Number(existing.countInStock || 0);
                    const hasStockLimit = Number.isFinite(countInStock) && countInStock > 0;
                    existing.quantity = hasStockLimit ? Math.min(nextQty, countInStock) : nextQty;
                    return acc;
                }, [])
                : [];
        default:
            return state;
    }
};

export default cartItems;
