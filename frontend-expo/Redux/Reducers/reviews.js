import {
    REVIEWS_REQUEST,
    REVIEWS_SUCCESS,
    REVIEWS_FAIL,
} from "../constants";

const initialState = {
    byProductId: {},
    loadingByProductId: {},
    errorByProductId: {},
};

const reviews = (state = initialState, action) => {
    const productId = String(action.productId || "");
    switch (action.type) {
        case REVIEWS_REQUEST:
            return {
                ...state,
                loadingByProductId: {
                    ...state.loadingByProductId,
                    [productId]: true,
                },
                errorByProductId: {
                    ...state.errorByProductId,
                    [productId]: null,
                },
            };
        case REVIEWS_SUCCESS:
            return {
                ...state,
                byProductId: {
                    ...state.byProductId,
                    [productId]: Array.isArray(action.payload) ? action.payload : [],
                },
                loadingByProductId: {
                    ...state.loadingByProductId,
                    [productId]: false,
                },
            };
        case REVIEWS_FAIL:
            return {
                ...state,
                loadingByProductId: {
                    ...state.loadingByProductId,
                    [productId]: false,
                },
                errorByProductId: {
                    ...state.errorByProductId,
                    [productId]: action.payload || "Failed to load reviews",
                },
            };
        default:
            return state;
    }
};

export default reviews;
