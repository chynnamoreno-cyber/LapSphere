/**
 * Auth context provider: holds login state (isAuthenticated, user) and exposes dispatch.
 * Login/Register screens call Auth.actions (loginUser, etc.); success updates this state.
 */
import React, { useEffect, useReducer, useState } from "react";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from "../Reducers/Auth.reducer";
import { setCurrentUser } from "../Actions/Auth.actions";
import AuthGlobal from './AuthGlobal';

const Auth = props => {
    const [stateUser, dispatch] = useReducer(authReducer, {
        isAuthenticated: null,
        user: {}
    });
    const [showChild, setShowChild] = useState(false);

    useEffect(() => {
        setShowChild(true);
        if (AsyncStorage.jwt) {
            const decoded = AsyncStorage.jwt ? AsyncStorage.jwt : "";
            if (setShowChild) {
                dispatch(setCurrentUser(jwtDecode(decoded)));
            }
        }
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
