import { useNavigation, DrawerActions } from "@react-navigation/native";
import React, { useContext, useState } from "react";
import { Drawer } from "react-native-paper";
import AuthGlobal from "../Context/Store/AuthGlobal";

/**
 * Drawer sits above the single screen "PeakPlay" (Main tabs).
 * Must navigate with nested { screen, params } — not reset({ routes: [{ name: "Home" }] }),
 * because "Home" is not a drawer route (that broke Profile / last-menu bugs).
 */
const DrawerContent = () => {
    const [active, setActive] = useState("");
    const navigation = useNavigation();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    const goMain = (tabScreen, params) => {
        navigation.navigate("PeakPlay", params ? { screen: tabScreen, params } : { screen: tabScreen });
        navigation.dispatch(DrawerActions.closeDrawer());
    };

    return (
        <Drawer.Section title="Menu">
            <Drawer.Item
                label="Home"
                active={active === "Home"}
                onPress={() => {
                    setActive("Home");
                    goMain("Home");
                }}
                icon="home"
            />
            <Drawer.Item
                label="My Profile"
                active={active === "My Profile"}
                onPress={() => {
                    setActive("My Profile");
                    goMain("User", { screen: "User Profile" });
                }}
                icon="account"
            />
            <Drawer.Item
                label="My Orders"
                active={active === "My Orders"}
                onPress={() => {
                    setActive("My Orders");
                    // Route through User stack so My Orders always has header + drawer menu button.
                    goMain("User", { screen: "My Orders" });
                }}
                icon="cart-variant"
            />
            <Drawer.Item
                label="Notification"
                active={active === "Notification"}
                onPress={() => {
                    setActive("Notification");
                    goMain("User", { screen: "Notifications" });
                }}
                icon="bell"
            />
            {isAdmin ? (
                <Drawer.Item
                    label="Admin Dashboard"
                    active={active === "Admin Dashboard"}
                    onPress={() => {
                        setActive("Admin Dashboard");
                        goMain("Admin", { screen: "Products" });
                    }}
                    icon="cog"
                />
            ) : null}
        </Drawer.Section>
    );
};

export default DrawerContent;
