import React, { useCallback, useContext } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import OrderCard from "../../Shared/OrderCard";
import { fetchOrders } from "../../Redux/Actions/orderActions";

const MyOrders = () => {
    const dispatch = useDispatch();
    const orderList = useSelector((state) => state.orders?.list || []);
    const loading = useSelector((state) => state.orders?.loading === true);
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;

            if (context.stateUser.isAuthenticated === false || context.stateUser.isAuthenticated === null) {
                navigation.navigate("User", { screen: "Login" });
                return () => {};
            }

            dispatch(fetchOrders());

            return () => {
                isMounted = false;
            };
        }, [context.stateUser.isAuthenticated, navigation, dispatch])
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <Text style={{ color: "#1a1a1a", fontSize: 16 }}>Loading orders...</Text>
            </View>
        );
    }

    if (!orderList.length) {
        return (
            <View style={styles.center}>
                <Text style={{ color: "#1a1a1a", fontSize: 16 }}>No orders yet.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={orderList}
                renderItem={({ item }) => (
                    <OrderCard
                        item={item}
                        update={true}
                        isAdmin={false}
                        onStatusUpdated={() => dispatch(fetchOrders())}
                    />
                )}
                keyExtractor={(item) => String(item.id || item._id)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5" },
});

export default MyOrders;
