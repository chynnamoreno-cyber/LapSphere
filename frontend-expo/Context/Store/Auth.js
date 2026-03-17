/**
 * Auth context provider: holds login state (isAuthenticated, user) and exposes dispatch.
 * Login/Register screens call Auth.actions (loginUser, etc.); success updates this state.
 */
import React, { useEffect, useReducer, useState } from "react";
import { jwtDecode } from "jwt-decode";

import authReducer from "../Reducers/Auth.reducer";
import { setCurrentUser } from "../Actions/Auth.actions";
import AuthGlobal from './AuthGlobal';
import { getJwtToken, removeJwtToken } from "../../assets/common/authToken";

const Auth = props => {
    const [stateUser, dispatch] = useReducer(authReducer, {
        isAuthenticated: null,
        user: {}
    });
    const [showChild, setShowChild] = useState(false);

    useEffect(() => {
        setShowChild(true);
        // [Unit 2] Restore auth on app start - load JWT from storage to keep user logged in
        getJwtToken().then((token) => {
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    dispatch(setCurrentUser(decoded));
                } catch (_e) {
                    removeJwtToken();
                }
            }
        }).catch(() => {});
        return () => setShowChild(false);
    }, []);

    if (!showChild) {
        return null;
    }
    return (
        <AuthGlobal.Provider value={{ stateUser, dispatch }}>
            {props.children}
        </AuthGlobal.Provider>
    );
};

export default Auth;
