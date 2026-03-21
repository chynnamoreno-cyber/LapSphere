import React, { useCallback } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import OrderCard from "../../Shared/OrderCard";
import { fetchOrders } from "../../Redux/Actions/orderActions";
import { adminTheme } from "../../assets/common/adminTheme";

const Orders = () => {
    const dispatch = useDispatch();
    const orderList = useSelector((state) => state.orders?.list || []);

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchOrders());
            return () => {
                // keep orders in store for quick back navigation
            };
        }, [dispatch])
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={orderList}
                renderItem={({ item }) => (
                    <OrderCard
                        item={item}
                        update={true}
                        isAdmin={true}
                        onStatusUpdated={() => dispatch(fetchOrders())}
                    />
                )}
                keyExtractor={(item) => String(item.id || item._id)}
                scrollEnabled={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: adminTheme.colors.background,
    },
});

export default Orders;
