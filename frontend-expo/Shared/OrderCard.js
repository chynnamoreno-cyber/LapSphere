import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import TrafficLight from "./StyledComponents/TrafficLight";
import EasyButton from "./StyledComponents/EasyButton";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import baseURL from "../assets/common/baseurl";
import { useNavigation } from "@react-navigation/native";
import { getJwtToken } from "../assets/common/authToken";

const STATUS = {
    PENDING: "pending",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
};

const adminTransitions = {
    [STATUS.PENDING]: [STATUS.SHIPPED, STATUS.CANCELLED],
    [STATUS.SHIPPED]: [STATUS.CANCELLED],
    [STATUS.DELIVERED]: [],
    [STATUS.CANCELLED]: [],
};

const userTransitions = {
    [STATUS.PENDING]: [STATUS.CANCELLED],
    [STATUS.SHIPPED]: [STATUS.DELIVERED, STATUS.CANCELLED],
    [STATUS.DELIVERED]: [],
    [STATUS.CANCELLED]: [],
};

const normalizeStatus = (value) => {
    if (!value) return "";
    const lowered = String(value).toLowerCase();
    if (lowered === "3") return STATUS.PENDING;
    if (lowered === "2") return STATUS.SHIPPED;
    if (lowered === "1") return STATUS.DELIVERED;
    return lowered;
};

const OrderCard = ({ item, update, isAdmin = false, onStatusUpdated }) => {
    const [orderStatus, setOrderStatus] = useState("");
    const [statusText, setStatusText] = useState("");
    const [statusChange, setStatusChange] = useState("");
    const [cardColor, setCardColor] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const navigation = useNavigation();

    const currentStatus = normalizeStatus(item.status);
    const transitions = isAdmin ? adminTransitions : userTransitions;
    const allowed = useMemo(() => transitions[currentStatus] || [], [transitions, currentStatus]);

    useEffect(() => {
        if (!update) return;
        if (allowed.length === 0) {
            setStatusChange("");
            return;
        }

        // Keep picker state valid: default to the first allowed transition.
        setStatusChange((prev) => (allowed.includes(prev) ? prev : allowed[0]));
    }, [allowed, update]);

    const updateOrder = () => {
        if (isUpdating) return;
        if (!statusChange) return;
        setIsUpdating(true);
        getJwtToken()
            .then((res) => {
                const token = res || "";
                const config = {
                    headers: { Authorization: `Bearer ${token}` },
                };
                return axios.put(
                    `${baseURL}orders/${item.id || item._id}`,
                    { status: statusChange },
                    config
                );
            })
            .then((res) => {
                if (res.status === 200 || res.status === 201) {
                    Toast.show({
                        topOffset: 60,
                        type: "success",
                        text1: "Order Updated",
                        text2: "",
                    });
                    if (typeof onStatusUpdated === "function") {
                        onStatusUpdated(statusChange);
                    }
                }
            })
            .catch((error) => {
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    "Please try again";
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Something went wrong",
                    text2: message,
                });
            })
            .finally(() => setIsUpdating(false));
    };

    useEffect(() => {
        const normalized = normalizeStatus(item.status);
        if (normalized === STATUS.PENDING) {
            setOrderStatus(<TrafficLight unavailable />);
            setStatusText(STATUS.PENDING);
            setCardColor("#E74C3C");
        } else if (normalized === STATUS.SHIPPED) {
            setOrderStatus(<TrafficLight limited />);
            setStatusText(STATUS.SHIPPED);
            setCardColor("#F1C40F");
        } else if (normalized === STATUS.DELIVERED) {
            setOrderStatus(<TrafficLight available />);
            setStatusText(STATUS.DELIVERED);
            setCardColor("#2ECC71");
        } else {
            setOrderStatus(<TrafficLight unavailable />);
            setStatusText(STATUS.CANCELLED);
            setCardColor("#9B59B6");
        }
        return () => {
            setOrderStatus();
            setStatusText();
            setCardColor();
        };
    }, [item.status]);

    return (
        <View style={[{ backgroundColor: cardColor }, styles.container]}>
            <View style={styles.container}>
                <Text>Order Number: #{item.id}</Text>
            </View>
            <View style={{ marginTop: 10 }}>
                <Text>
                    Status: {statusText} {orderStatus}
                </Text>
                <Text>
                    Address: {item.shippingAddress1} {item.shippingAddress2}
                </Text>
                <Text>City: {item.city}</Text>
                <Text>Country: {item.country}</Text>
                <Text>Date Ordered: {item.dateOrdered.split("T")[0]}</Text>
                <View style={styles.priceContainer}>
                    <Text>Price: </Text>
                    <Text style={styles.price}>$ {item.totalPrice}</Text>
                </View>

                {!isAdmin && Array.isArray(item.orderItems) && item.orderItems.length > 0 ? (
                    <View style={styles.reviewSection}>
                        <Text style={styles.reviewHeader}>Order Items</Text>
                        {item.orderItems.map((orderItem, index) => {
                            const productId =
                                typeof orderItem.product === "object"
                                    ? (orderItem.product?.id || orderItem.product?._id)
                                    : orderItem.product;
                            const hasUserReview = orderItem.hasUserReview === true;
                            const canLeaveReview = orderItem.canLeaveReview === true;
                            const allowReviewButton = statusText === STATUS.DELIVERED && (canLeaveReview || hasUserReview);

                            return (
                                <View key={`${productId || orderItem.name || "item"}-${index}`} style={styles.reviewItemRow}>
                                    <Text style={styles.reviewItemName}>
                                        {orderItem.name} x {orderItem.quantity || 1}
                                    </Text>
                                    {allowReviewButton ? (
                                        <TouchableOpacity
                                            style={styles.reviewBtn}
                                            onPress={() =>
                                                navigation.navigate("Home", {
                                                    screen: "Leave Review",
                                                    params: {
                                                        orderId: item.id || item._id,
                                                        productId,
                                                        productName: orderItem.name,
                                                    },
                                                })
                                            }
                                        >
                                            <Text style={styles.reviewBtnText}>
                                                {hasUserReview ? "Edit Review" : "Leave a Review"}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {update && allowed.length > 0 ? (
                    <View>
                        <Picker
                            style={{ width: "100%" }}
                            selectedValue={statusChange}
                            onValueChange={(e) => setStatusChange(e)}
                        >
                            {allowed.map((value) => (
                                <Picker.Item key={value} label={value} value={value} />
                            ))}
                        </Picker>
                        <EasyButton secondary large onPress={() => updateOrder()}>
                            {isUpdating ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={{ color: "white" }}>Update</Text>
                            )}
                        </EasyButton>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        margin: 10,
        borderRadius: 10,
    },
    priceContainer: {
        marginTop: 10,
        alignSelf: "flex-end",
        flexDirection: "row",
    },
    price: {
        color: "white",
        fontWeight: "bold",
    },
    reviewSection: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.4)",
        paddingTop: 10,
    },
    reviewHeader: {
        fontWeight: "700",
        color: "#fff",
        marginBottom: 6,
    },
    reviewItemRow: {
        marginBottom: 10,
    },
    reviewItemName: {
        color: "#fff",
        marginBottom: 6,
    },
    reviewBtn: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(0,0,0,0.25)",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    reviewBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
    },
});

export default OrderCard;
