import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import Login from "../Screens/User/Login";
import Register from "../Screens/User/Register";
import UserProfile from "../Screens/User/UserProfile";
import MyOrders from "../Screens/User/MyOrders";
import NotificationCenter from "../Screens/User/NotificationCenter";
import OrderDetails from "../Screens/User/OrderDetails";
import NotificationDetail from "../Screens/User/NotificationDetail";

const Stack = createStackNavigator();

const UserNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="User Profile">
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
            <Stack.Screen
                name="User Profile"
                component={UserProfile}
                options={({ navigation }) => ({
                    headerShown: true,
                    title: "My Profile",
                    headerLeft: () => (
                        <Ionicons
                            name="menu"
                            size={24}
                            color="#333"
                            style={{ marginLeft: 15 }}
                            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                        />
                    ),
                })}
            />
            <Stack.Screen
                name="My Orders"
                component={MyOrders}
                options={({ navigation }) => ({
                    headerShown: true,
                    title: "My Orders",
                    headerLeft: () => (
                        <Ionicons
                            name="menu"
                            size={24}
                            color="#333"
                            style={{ marginLeft: 15 }}
                            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                        />
                    ),
                })}
            />
            <Stack.Screen name="Order Details" component={OrderDetails} options={{ title: "Order Details" }} />
            <Stack.Screen
                name="Notifications"
                component={NotificationCenter}
                options={({ navigation }) => ({
                    title: "Notifications",
                    headerLeft: () => (
                        <Ionicons
                            name="menu"
                            size={24}
                            color="#333"
                            style={{ marginLeft: 15 }}
                            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                        />
                    ),
                })}
            />
            <Stack.Screen name="Notification Detail" component={NotificationDetail} options={{ title: "Notification Detail" }} />
        </Stack.Navigator>
    );
};

export default UserNavigator;
