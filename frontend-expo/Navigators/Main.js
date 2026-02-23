/**
 * Main tab navigator: bottom tabs for Home, Cart, Admin, User.
 * Each tab has its own stack (HomeNavigator, CartNavigator, etc.).
 */
import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeNavigator from "./HomeNavigator";
import CartNavigator from "./CartNavigator";
import CartIcon from "../Shared/CartIcon";
import UserNavigator from "./UserNavigator";
import AdminNavigator from "./AdminNavigator";
import AuthGlobal from "../Context/Store/AuthGlobal";
import MyOrders from "../Screens/User/MyOrders";

const Tab = createBottomTabNavigator();

const Main = () => {
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarShowLabel: false,
                tabBarActiveTintColor: "#e91e63",
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home" style={{ position: "relative" }} color={color} size={30} />
                    ),
                }}
            />
            <Tab.Screen
                name="Cart Screen"
                component={CartNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <>
                            <Ionicons name="cart" style={{ position: "relative" }} color={color} size={30} />
                            <CartIcon />
                        </>
                    ),
                }}
            />
            {isAdmin ? (
                <Tab.Screen
                    name="Admin"
                    component={AdminNavigator}
                    options={{
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="cog" style={{ position: "relative" }} color={color} size={30} />
                        ),
                    }}
                />
            ) : null}
            {!isAdmin ? (
                <Tab.Screen
                    name="My Orders"
                    component={MyOrders}
                    options={{
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="receipt-outline" style={{ position: "relative" }} color={color} size={28} />
                        ),
                    }}
                />
            ) : null}
            <Tab.Screen
                name="User"
                component={UserNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person" style={{ position: "relative" }} color={color} size={30} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export default Main;
