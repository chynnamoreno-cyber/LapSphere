import React, { useCallback } from "react";
import { View, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import OrderCard from "../../Shared/OrderCard";
import { fetchOrders } from "../../Redux/Actions/orderActions";

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
        <View>
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
            />
        </View>
    );
};

export default Orders;
