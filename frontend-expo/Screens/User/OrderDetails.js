import React, { useCallback, useContext } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import OrderCard from "../../Shared/OrderCard";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { fetchOrderById } from "../../Redux/Actions/orderActions";

const OrderDetails = () => {
    const route = useRoute();
    const dispatch = useDispatch();
    const context = useContext(AuthGlobal);

    const orderId = route?.params?.orderId;
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const order = useSelector((state) => state.orders?.detailsById?.[String(orderId || "")] || null);
    const loading = useSelector((state) => state.orders?.loadingDetails === true);
    const error = useSelector((state) => state.orders?.error || "");

    useFocusEffect(
        useCallback(() => {
            if (!orderId) return () => {};
            dispatch(fetchOrderById(orderId));
            return () => {};
        }, [orderId, dispatch])
    );

    if (!orderId) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Missing order reference in notification.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#e91e63" />
                <Text style={styles.infoText}>Loading order details...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Unable to load this order.</Text>
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.center}>
                <Text style={styles.infoText}>Order not found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <OrderCard item={order} update={isAdmin} isAdmin={isAdmin} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 24,
    },
    infoText: {
        marginTop: 12,
        fontSize: 15,
        color: "#444",
        textAlign: "center",
    },
    errorText: {
        fontSize: 15,
        color: "#b00020",
        textAlign: "center",
    },
});

export default OrderDetails;
