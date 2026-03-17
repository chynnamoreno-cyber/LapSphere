/**
 * Auth flow: Splash -> Onboarding -> Login / Register
 * Shown when user is not authenticated.
 */
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import SplashScreen from "../Screens/Auth/SplashScreen";
import OnboardingScreen from "../Screens/Auth/OnboardingScreen";
import Login from "../Screens/User/Login";
import Register from "../Screens/User/Register";

const Stack = createStackNavigator();

const AuthFlowNavigator = () => (
    <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
    >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
    </Stack.Navigator>
);

export default AuthFlowNavigator;
