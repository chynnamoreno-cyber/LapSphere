import React, { useState, useContext } from "react";
import { View, StyleSheet, Dimensions, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Surface, Avatar, Divider, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import Toast from "react-native-toast-message";
import { clearCart } from "../../Redux/Actions/cartActions";
import { getJwtToken } from "../../assets/common/authToken";
import { MaterialIcons } from "@expo/vector-icons";

var { width, height } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const Confirm = (props) => {
    const [token, setToken] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const finalOrder = props.route.params;
    const order = finalOrder?.order;
    const dispatch = useDispatch();
    const navigation = useNavigation();

    const confirmOrder = () => {
        if (isProcessing) return;
        setIsProcessing(true);

        getJwtToken()
            .then((res) => {
                setToken(res || "");
                const config = { headers: { Authorization: "Bearer " + res } };
                return axios.post(`${baseURL}orders`, order, config);
            })
            .then((res) => {
                setIsProcessing(false);
                Toast.show({
                    topOffset: 60,
                    type: "success",
                    text1: "Order Placed Successfully!",
                    text2: `Order #${res.data.id || res.data._id} has been confirmed`,
                });
                setTimeout(() => {
                    dispatch(clearCart());
                    // Navigate parent stack back to close checkout, which will return to cart tab
                    navigation.getParent()?.goBack();
                }, 1500);
            })
            .catch((error) => {
                setIsProcessing(false);
                const errorMsg = error?.response?.data?.message || error.message || "Order could not be placed";
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Order Failed",
                    text2: errorMsg,
                });
            });
    };

    if (!order) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>No order data available.</Text>
            </View>
        );
    }

    const totalPrice = order.orderItems?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;

    return (
        <ScrollView style={styles.background}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Order Confirmation</Text>
                    <Text style={styles.subtitle}>Review and confirm your order</Text>
                </View>

                {/* Shipping Address */}
                <Surface style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="location-on" size={20} color="#1e40af" />
                        <Text style={styles.cardTitle}>Shipping Address</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.addressBlock}>
                        <Text style={styles.addressLine}>{order.shippingAddress1}</Text>
                        {order.shippingAddress2 && <Text style={styles.addressLine}>{order.shippingAddress2}</Text>}
                        <Text style={styles.addressLine}>{order.city}, {order.zip}</Text>
                        <Text style={styles.addressLine}>{order.country}</Text>
                        <Text style={[styles.addressLine, styles.phoneNumber]}>📞 {order.phone}</Text>
                    </View>
                </Surface>

                {/* Order Items */}
                <Surface style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="shopping-cart" size={20} color="#1e40af" />
                        <Text style={styles.cardTitle}>Order Items ({order.orderItems?.length || 0})</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.itemsContainer}>
                        {order.orderItems?.map((item, idx) => (
                            <View key={item.id || item._id || idx}>
                                <View style={styles.itemCard}>
                                    <Avatar.Image
                                        size={60}
                                        source={{ uri: item.image || FALLBACK_IMAGE }}
                                    />
                                    <View style={styles.itemDetails}>
                                        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                                        <View style={styles.itemMeta}>
                                            <Text style={styles.itemQtyPrice}>Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</Text>
                                            <Text style={styles.itemTotal}>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</Text>
                                        </View>
                                    </View>
                                </View>
                                {idx < order.orderItems.length - 1 && <Divider style={styles.itemDivider} />}
                            </View>
                        ))}
                    </View>
                </Surface>

                {/* Order Summary */}
                <Surface style={styles.card}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
                    </View>
                    <Divider style={styles.finalDivider} />
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
                    </View>
                </Surface>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, isProcessing && styles.buttonDisabled]}
                        onPress={confirmOrder}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <MaterialIcons name="check-circle" size={20} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Confirm & Place Order</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.note}>By confirming this order, you agree to our terms and conditions</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    container: {
        minHeight: height,
        paddingHorizontal: 16,
        paddingVertical: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a1a",
        marginLeft: 8,
    },
    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginBottom: 12,
    },
    addressBlock: {
        paddingVertical: 4,
    },
    addressLine: {
        fontSize: 14,
        color: "#333",
        marginBottom: 6,
        lineHeight: 20,
    },
    phoneNumber: {
        marginTop: 8,
        fontWeight: "600",
        color: "#1e40af",
    },
    itemsContainer: {
        gap: 0,
    },
    itemCard: {
        flexDirection: "row",
        paddingVertical: 12,
        alignItems: "flex-start",
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "space-between",
    },
    itemName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    itemMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemQtyPrice: {
        fontSize: 12,
        color: "#666",
    },
    itemTotal: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1e40af",
    },
    itemDivider: {
        backgroundColor: "#e5e7eb",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: "#666",
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a1a",
    },
    finalDivider: {
        backgroundColor: "#e5e7eb",
        marginVertical: 8,
    },
    totalRow: {
        paddingVertical: 12,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a1a",
    },
    totalValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e40af",
    },
    buttonContainer: {
        marginTop: 24,
        marginBottom: 16,
    },
    button: {
        backgroundColor: "#1e40af",
        paddingVertical: 14,
        borderRadius: 8,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    note: {
        fontSize: 12,
        color: "#999",
        textAlign: "center",
        fontStyle: "italic",
    },
    errorText: {
        fontSize: 16,
        color: "#ef4444",
        fontWeight: "600",
    },
});

export default Confirm;
