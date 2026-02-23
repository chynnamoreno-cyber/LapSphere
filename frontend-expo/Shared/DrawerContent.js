import { useNavigation } from "@react-navigation/native";
import React, { useContext, useState } from "react";
import { Drawer } from "react-native-paper";
import AuthGlobal from "../Context/Store/AuthGlobal";

const DrawerContent = () => {
    const [active, setActive] = useState("");
    const navigation = useNavigation();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    const onClick = (screen) => {
        setActive(screen);
        // Add navigation or other logic if needed
    };

    return (
        <Drawer.Section title="Drawer">
            <Drawer.Item
                label="My Profile"
                onPress={() => navigation.navigate("User", { screen: "User Profile" })}
                icon="account"
            />
            {!isAdmin ? (
                <Drawer.Item
                    label="My Orders"
                    onPress={() => navigation.navigate("User", { screen: "My Orders" })}
                    icon="cart-variant"
                />
            ) : null}
            <Drawer.Item
                label="Recents"
                active={active === "Recents"}
                onPress={() => onClick("Recents")}
                icon="history"
            />
            <Drawer.Item
                label="Notifications"
                active={active === "Notifications"}
                onPress={() => {
                    setActive("Notifications");
                    navigation.navigate("User", { screen: "Notifications" });
                }}
                icon="bell"
            />
        </Drawer.Section>
    );
};

export default DrawerContent;
