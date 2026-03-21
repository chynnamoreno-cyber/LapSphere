import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, TextInput } from "react-native";
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
    [STATUS.SHIPPED]: [STATUS.DELIVERED, STATUS.CANCELLED],
    [STATUS.DELIVERED]: [],
    [STATUS.CANCELLED]: [],
};

const userTransitions = {
    [STATUS.PENDING]: [STATUS.CANCELLED],
    [STATUS.SHIPPED]: [STATUS.CANCELLED],
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
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellationReason, setCancellationReason] = useState("");
    const [isApprovingRejecting, setIsApprovingRejecting] = useState(false);
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

        // If user tries to cancel a shipped order, show modal to get reason
        if (statusChange === STATUS.CANCELLED && !isAdmin && currentStatus === STATUS.SHIPPED && !cancellationReason) {
            setShowCancelModal(true);
            return;
        }

        // If cancelling a pending order (user), show modal to get reason if not already provided
        if (statusChange === STATUS.CANCELLED && !isAdmin && currentStatus === STATUS.PENDING && !cancellationReason) {
            setShowCancelModal(true);
            return;
        }

        setIsUpdating(true);
        getJwtToken()
            .then((res) => {
                const token = res || "";
                const config = {
                    headers: { Authorization: `Bearer ${token}` },
                };
                const payload = { status: statusChange };
                if (statusChange === STATUS.CANCELLED && cancellationReason) {
                    payload.cancellationReason = cancellationReason;
                }
                return axios.put(
                    `${baseURL}orders/${item.id || item._id}`,
                    payload,
                    config
                );
            })
            .then((res) => {
                if (res.status === 200 || res.status === 201) {
                    const isShippedCancellation = !isAdmin && currentStatus === STATUS.SHIPPED && statusChange === STATUS.CANCELLED;
                    const message = isShippedCancellation 
                        ? "Cancellation request sent to admin for approval" 
                        : (statusChange === STATUS.CANCELLED ? "Order has been cancelled" : `Status updated to ${statusChange}`);
                    
                    Toast.show({
                        topOffset: 60,
                        type: "success",
                        text1: "Request Submitted",
                        text2: message,
                    });
                    setCancellationReason("");
                    setShowCancelModal(false);
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

    const handleApproveCancellation = () => {
        if (isApprovingRejecting) return;
        setIsApprovingRejecting(true);

        getJwtToken()
            .then((res) => {
                const token = res || "";
                const config = {
                    headers: { Authorization: `Bearer ${token}` },
                };
                return axios.put(
                    `${baseURL}orders/${item.id || item._id}/approve-cancellation`,
                    { approve: true },
                    config
                );
            })
            .then((res) => {
                Toast.show({
                    topOffset: 60,
                    type: "success",
                    text1: "Approved",
                    text2: "Cancellation request approved",
                });
                if (typeof onStatusUpdated === "function") {
                    onStatusUpdated("cancelled");
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
            .finally(() => setIsApprovingRejecting(false));
    };

    const handleRejectCancellation = () => {
        if (isApprovingRejecting) return;
        setIsApprovingRejecting(true);

        getJwtToken()
            .then((res) => {
                const token = res || "";
                const config = {
                    headers: { Authorization: `Bearer ${token}` },
                };
                return axios.put(
                    `${baseURL}orders/${item.id || item._id}/approve-cancellation`,
                    { approve: false },
                    config
                );
            })
            .then((res) => {
                Toast.show({
                    topOffset: 60,
                    type: "success",
                    text1: "Rejected",
                    text2: "Cancellation request rejected",
                });
                if (typeof onStatusUpdated === "function") {
                    onStatusUpdated(currentStatus);
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
            .finally(() => setIsApprovingRejecting(false));
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
        <View style={styles.card}>
            {/* Left Status Indicator */}
            <View style={[styles.statusIndicator, { backgroundColor: cardColor }]} />
            
            {/* Card Content */}
            <View style={styles.cardContent}>
                {/* Header: Order Number and Status */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.orderNumber}>Order #{item.id?.toString().slice(-6) || item._id?.toString().slice(-6)}</Text>
                        <View style={styles.statusBadgeContainer}>
                            {orderStatus}
                            <Text style={[styles.statusBadge, { color: cardColor }]}>{statusText}</Text>
                        </View>
                    </View>
                    <Text style={styles.price}>$ {item.totalPrice}</Text>
                </View>

                {/* Shipping Details */}
                <View style={styles.details}>
                    <Text style={styles.detailLabel}>Shipping Address</Text>
                    <Text style={styles.detailText}>
                        {item.shippingAddress1} {item.shippingAddress2}
                    </Text>
                    <Text style={styles.detailText}>{item.city}, {item.country}</Text>
                    <Text style={styles.dateText}>
                        Ordered: {item.dateOrdered.split("T")[0]}
                    </Text>
                </View>

                {/* Order Items - Show for both admin and users */}
                {Array.isArray(item.orderItems) && item.orderItems.length > 0 ? (
                    <View style={styles.itemsSection}>
                        <Text style={styles.itemsTitle}>Items ({item.orderItems.length})</Text>
                        {item.orderItems.map((orderItem, index) => {
                            const productId =
                                typeof orderItem.product === "object"
                                    ? (orderItem.product?.id || orderItem.product?._id)
                                    : orderItem.product;
                            const hasUserReview = orderItem.hasUserReview === true;
                            const canLeaveReview = orderItem.canLeaveReview === true;
                            const allowReviewButton = !isAdmin && statusText === STATUS.DELIVERED && (canLeaveReview || hasUserReview);

                            return (
                                <View key={`${productId || orderItem.name || "item"}-${index}`} style={styles.itemRow}>
                                    <Text style={styles.itemName}>
                                        {orderItem.name} <Text style={styles.qty}>x{orderItem.quantity || 1}</Text>
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
                                                {hasUserReview ? "Edit" : "Review"}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {/* Admin Cancellation Approval Section */}
                {isAdmin && item.cancellationApprovalStatus === "pending_approval" ? (
                    <View style={styles.cancellationApprovalSection}>
                        <View style={styles.cancellationHeader}>
                            <Text style={styles.cancellationTitle}>⚠️ Cancellation Request Pending</Text>
                        </View>
                        <View style={styles.cancellationReason}>
                            <Text style={styles.reasonLabel}>Reason from buyer:</Text>
                            <Text style={styles.reasonText}>{item.cancellationReason || "No reason provided"}</Text>
                        </View>
                        <View style={styles.approvalButtons}>
                            <TouchableOpacity 
                                style={[styles.approvalBtn, styles.rejectBtn]}
                                onPress={handleRejectCancellation}
                                disabled={isApprovingRejecting}
                            >
                                <Text style={styles.approvalBtnText}>
                                    {isApprovingRejecting ? "Processing..." : "❌ Reject"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.approvalBtn, styles.approveBtn]}
                                onPress={handleApproveCancellation}
                                disabled={isApprovingRejecting}
                            >
                                <Text style={styles.approvalBtnText}>
                                    {isApprovingRejecting ? "Processing..." : "✅ Approve"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                {/* Status Update Section */}
                {update && allowed.length > 0 ? (
                    <View style={styles.updateSection}>
                        <Picker
                            style={styles.picker}
                            selectedValue={statusChange}
                            onValueChange={(e) => setStatusChange(e)}
                        >
                            {allowed.map((value) => (
                                <Picker.Item key={value} label={value} value={value} />
                            ))}
                        </Picker>
                        <EasyButton secondary large onPress={() => updateOrder()} style={styles.updateBtn}>
                            {isUpdating ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={{ color: "white", fontWeight: "600" }}>Update Status</Text>
                            )}
                        </EasyButton>
                    </View>
                ) : null}

                {/* Cancellation Reason Modal */}
                <Modal
                    transparent
                    visible={showCancelModal}
                    onRequestClose={() => setShowCancelModal(false)}
                    animationType="slide"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>
                                {currentStatus === STATUS.SHIPPED ? "Request Cancellation" : "Cancel Order"}
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                {currentStatus === STATUS.SHIPPED
                                    ? "Your cancellation request will be sent to admin for approval. Please provide a reason:"
                                    : "Please provide a reason for cancellation:"}
                            </Text>
                            <TextInput
                                style={styles.reasonInput}
                                placeholder="Enter reason for cancellation..."
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={4}
                                value={cancellationReason}
                                onChangeText={setCancellationReason}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnCancel]}
                                    onPress={() => {
                                        setShowCancelModal(false);
                                        setCancellationReason("");
                                    }}
                                >
                                    <Text style={styles.modalBtnText}>Go Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnConfirm]}
                                    onPress={() => updateOrder()}
                                    disabled={!cancellationReason.trim()}
                                >
                                    <Text style={styles.modalBtnText}>
                                        {isUpdating 
                                            ? "Processing..." 
                                            : currentStatus === STATUS.SHIPPED 
                                                ? "Send Request" 
                                                : "Confirm Cancel"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        marginHorizontal: 12,
        marginVertical: 8,
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusIndicator: {
        width: 4,
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    orderNumber: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 6,
    },
    statusBadgeContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statusBadge: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "capitalize",
    },
    price: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e40af",
    },
    details: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        paddingBottom: 12,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    detailText: {
        fontSize: 14,
        color: "#1a1a1a",
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: "#999",
        marginTop: 6,
    },
    itemsSection: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        paddingBottom: 12,
    },
    itemsTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    itemName: {
        flex: 1,
        fontSize: 13,
        color: "#1a1a1a",
        marginRight: 8,
    },
    qty: {
        fontSize: 12,
        color: "#999",
        fontWeight: "500",
    },
    reviewBtn: {
        backgroundColor: "#f0f0f0",
        borderRadius: 6,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    reviewBtnText: {
        color: "#1e40af",
        fontWeight: "600",
        fontSize: 11,
    },
    updateSection: {
        marginTop: 12,
    },
    picker: {
        marginBottom: 12,
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
    },
    updateBtn: {
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "85%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
    },
    reasonInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: "#1a1a1a",
        textAlignVertical: "top",
        marginBottom: 16,
        backgroundColor: "#f9f9f9",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    modalBtnCancel: {
        backgroundColor: "#e0e0e0",
    },
    modalBtnConfirm: {
        backgroundColor: "#E74C3C",
    },
    modalBtnText: {
        fontWeight: "700",
        fontSize: 14,
        color: "#fff",
    },
    cancellationApprovalSection: {
        marginTop: 12,
        padding: 12,
        backgroundColor: "#FFF3CD",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FFE5A0",
    },
    cancellationHeader: {
        marginBottom: 8,
    },
    cancellationTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#D39E00",
    },
    cancellationReason: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#FFE5A0",
    },
    reasonLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#856404",
        marginBottom: 4,
    },
    reasonText: {
        fontSize: 13,
        color: "#664D03",
        lineHeight: 18,
    },
    approvalButtons: {
        flexDirection: "row",
        gap: 8,
    },
    approvalBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    approveBtn: {
        backgroundColor: "#28A745",
    },
    rejectBtn: {
        backgroundColor: "#DC3545",
    },
    approvalBtnText: {
        color: "white",
        fontWeight: "700",
        fontSize: 13,
    },
});

export default OrderCard;
