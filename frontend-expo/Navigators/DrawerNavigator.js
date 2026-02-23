import * as React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Main from "./Main";
import DrawerContent from "../Shared/DrawerContent";

const NativeDrawer = createDrawerNavigator();

const DrawerNavigator = () => {
    return (
        <NativeDrawer.Navigator
            screenOptions={{
                drawerStyle: { width: "50%" },
            }}
            drawerContent={() => <DrawerContent />}
        >
            <NativeDrawer.Screen name="My app" component={Main} />
        </NativeDrawer.Navigator>
    );
};

export default DrawerNavigator;
