import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
    SET_CART_ITEMS,
} from '../constants';

const cartItems = (state = [], action) => {
    switch (action.type) {
        case ADD_TO_CART:
            return [...state, action.payload];
        case REMOVE_FROM_CART:
            return state.filter((cartItem) => cartItem !== action.payload);
        case CLEAR_CART:
            return (state = []);
        case SET_CART_ITEMS:
            return Array.isArray(action.payload) ? action.payload : [];
        default:
            return state;
    }
};

export default cartItems;
