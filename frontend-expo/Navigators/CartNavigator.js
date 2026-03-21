import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { HeaderBackButton } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import Cart from "../Screens/Cart/Cart";
import CheckoutNavigator from "./CheckoutNavigator";

const Stack = createStackNavigator();

function MyStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Cart"
                component={Cart}
                options={({ navigation }) => ({
                    headerShown: true,
                    title: "Shopping Cart",
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
            <Stack.Screen name="Checkout" component={CheckoutNavigator} options={{ title: "Checkout" }} />
        </Stack.Navigator>
    );
}

export default function CartNavigator() {
    return <MyStack />;
}
