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
                onPress={() => {
                    setActive("Home");
                    goMain("Home");
                }}
                icon="home"
            />
            <Drawer.Item
                label="My Profile"
                onPress={() => {
                    setActive("My Profile");
                    goMain("User", { screen: "User Profile" });
                }}
                icon="account"
            />
            {!isAdmin ? (
                <Drawer.Item
                    label="My Orders"
                    onPress={() => {
                        setActive("My Orders");
                        goMain("My Orders");
                    }}
                    icon="cart-variant"
                />
            ) : null}
            <Drawer.Item
                label="Recents"
                onPress={() => {
                    setActive("Recents");
                    if (isAdmin) {
                        goMain("User", { screen: "My Orders" });
                    } else {
                        goMain("My Orders");
                    }
                }}
                icon="history"
            />
            <Drawer.Item
                label="Notifications"
                active={active === "Notifications"}
                onPress={() => {
                    setActive("Notifications");
                    goMain("User", { screen: "Notifications" });
                }}
                icon="bell"
            />
        </Drawer.Section>
    );
};

export default DrawerContent;
