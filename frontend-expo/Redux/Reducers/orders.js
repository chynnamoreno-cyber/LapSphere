import {
    ORDERS_REQUEST,
    ORDERS_SUCCESS,
    ORDERS_FAIL,
    CLEAR_ORDERS,
    ORDER_DETAIL_REQUEST,
    ORDER_DETAIL_SUCCESS,
    ORDER_DETAIL_FAIL,
} from "../constants";

const initialState = {
    list: [],
    detailsById: {},
    loading: false,
    loadingDetails: false,
    error: null,
};

const orders = (state = initialState, action) => {
    switch (action.type) {
        case ORDERS_REQUEST:
            return { ...state, loading: true, error: null };
        case ORDERS_SUCCESS:
            return {
                ...state,
                loading: false,
                list: Array.isArray(action.payload) ? action.payload : [],
            };
        case ORDERS_FAIL:
            return { ...state, loading: false, error: action.payload || "Failed to load orders" };
        case ORDER_DETAIL_REQUEST:
            return { ...state, loadingDetails: true, error: null };
        case ORDER_DETAIL_SUCCESS: {
            const order = action.payload || {};
            const id = order.id || order._id;
            if (!id) return { ...state, loadingDetails: false };

            return {
                ...state,
                loadingDetails: false,
                detailsById: {
                    ...state.detailsById,
                    [String(id)]: order,
                },
            };
        }
        case ORDER_DETAIL_FAIL:
            return { ...state, loadingDetails: false, error: action.payload || "Failed to load order detail" };
        case CLEAR_ORDERS:
            return { ...state, list: [], detailsById: {}, loading: false, loadingDetails: false, error: null };
        default:
            return state;
    }
};

export default orders;
