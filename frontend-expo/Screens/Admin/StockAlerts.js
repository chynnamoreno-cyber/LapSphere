import React, { useCallback, useState } from "react";
import { View, FlatList, Text, StyleSheet, RefreshControl, Modal, TextInput, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import { adminTheme } from "../../assets/common/adminTheme";

const StockAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [newStock, setNewStock] = useState("");
    const [updating, setUpdating] = useState(false);

    const loadAlerts = () => {
        return getJwtToken()
            .then((res) =>
                axios.get(`${baseURL}stock-alerts`, {
                    headers: { Authorization: `Bearer ${res || ""}` },
                })
            )
            .then((res) => setAlerts(res.data || []))
            .catch(() => setAlerts([]));
    };

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            loadAlerts().then(() => {
                if (!isMounted) return;
            });
            return () => {
                isMounted = false;
                setAlerts([]);
            };
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAlerts().finally(() => setRefreshing(false));
    }, []);

    const openEditModal = (alert) => {
        setSelectedAlert(alert);
        setNewStock(String(alert.stockLevel || alert.product?.countInStock || 0));
        setEditModal(true);
    };

    const closeEditModal = () => {
        setEditModal(false);
        setSelectedAlert(null);
        setNewStock("");
    };

    const updateStock = async () => {
        if (!selectedAlert || !selectedAlert.product) {
            Alert.alert("Error", "Product information missing");
            return;
        }

        const productId = selectedAlert.product._id || selectedAlert.product.id;
        if (!productId) {
            Alert.alert("Error", "Product ID not found. Please refresh and try again.");
            return;
        }

        const stockValue = parseInt(newStock, 10);
        if (isNaN(stockValue) || stockValue < 0) {
            Alert.alert("Invalid Input", "Please enter a valid stock number (0 or more)");
            return;
        }

        setUpdating(true);
        try {
            const token = await getJwtToken();
            console.log(`[Stock Edit] Updating ${selectedAlert.product.name} to stock: ${stockValue}, Product ID: ${productId}`);
            const response = await axios.put(
                `${baseURL}products/${productId}`,
                { countInStock: stockValue },
                { headers: { Authorization: `Bearer ${token || ""}` } }
            );

            console.log(`[Stock Edit] Success: ${response.data.name} - New stock: ${response.data.countInStock}`);
            Alert.alert("Success", `${response.data.name} stock updated to ${stockValue}`);
            closeEditModal();
            loadAlerts();
        } catch (error) {
            console.error("[Stock Edit Error]", error.response?.status, error.response?.data || error.message);
            Alert.alert("Error", error.response?.data?.message || "Failed to update stock");
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (resolved) => {
        return resolved ? adminTheme.colors.success : adminTheme.colors.warning;
    };

    return (
        <View style={styles.container}>
            {alerts.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="checkmark-circle-outline" size={48} color={adminTheme.colors.borderLight} />
                    <Text style={styles.emptyText}>No stock alerts</Text>
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor={adminTheme.colors.primaryLight}
                        />
                    }
                    keyExtractor={(item) => String(item.id || item._id)}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.titleContainer}>
                                    <Text style={styles.title}>{item.product?.name || "Unknown product"}</Text>
                                    <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.resolved) }]}>
                                        {item.resolved ? "Resolved" : "Active"}
                                    </Text>
                                </View>
                                <Ionicons 
                                    name={item.resolved ? "checkmark-done" : "warning"} 
                                    size={24} 
                                    color={getStatusColor(item.resolved)} 
                                />
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Type:</Text>
                                    <Text style={styles.value}>{item.type}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Current Stock:</Text>
                                    <Text style={styles.value}>{item.stockLevel || item.countInStock || 0}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Threshold:</Text>
                                    <Text style={styles.value}>{item.threshold}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.editButton}
                                    onPress={() => openEditModal(item)}
                                >
                                    <Ionicons name="pencil" size={16} color="white" />
                                    <Text style={styles.editButtonText}>Edit Stock</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            <Modal
                visible={editModal}
                transparent={true}
                animationType="fade"
                onRequestClose={closeEditModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Stock</Text>
                            <TouchableOpacity onPress={closeEditModal}>
                                <Ionicons name="close" size={24} color={adminTheme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedAlert && selectedAlert.product && (
                            <>
                                <View style={styles.modalBody}>
                                    <Text style={styles.modalProductName}>{selectedAlert.product.name}</Text>
                                    <Text style={styles.modalLabel}>Enter new stock quantity:</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Stock quantity"
                                        placeholderTextColor={adminTheme.colors.textTertiary}
                                        keyboardType="number-pad"
                                        value={newStock}
                                        onChangeText={setNewStock}
                                        editable={!updating}
                                    />
                                </View>

                                <View style={styles.modalFooter}>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={closeEditModal}
                                        disabled={updating}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={updateStock}
                                        disabled={updating}
                                    >
                                        <Text style={styles.saveButtonText}>
                                            {updating ? "Updating..." : "Update Stock"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: adminTheme.colors.background,
        padding: adminTheme.spacing.md,
    },
    center: { 
        flex: 1, 
        alignItems: "center", 
        justifyContent: "center",
        gap: adminTheme.spacing.md,
    },
    emptyText: {
        color: adminTheme.colors.textTertiary,
        fontSize: adminTheme.typography.fontSize.base,
    },
    card: {
        backgroundColor: adminTheme.colors.surface,
        padding: adminTheme.spacing.lg,
        borderRadius: adminTheme.radius.md,
        marginBottom: adminTheme.spacing.md,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: adminTheme.colors.warningColor || adminTheme.colors.warning,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: adminTheme.spacing.md,
    },
    titleContainer: {
        flex: 1,
        gap: adminTheme.spacing.sm,
    },
    title: { 
        fontWeight: "700", 
        color: adminTheme.colors.text,
        fontSize: adminTheme.typography.fontSize.base,
    },
    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: adminTheme.spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
        color: adminTheme.colors.text,
        fontSize: 10,
        fontWeight: "bold",
        overflow: "hidden",
    },
    cardContent: {
        gap: adminTheme.spacing.sm,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    label: {
        color: adminTheme.colors.textSecondary,
        fontSize: adminTheme.typography.fontSize.sm,
    },
    value: {
        color: adminTheme.colors.text,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.sm,
    },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: adminTheme.spacing.sm,
        backgroundColor: adminTheme.colors.primaryLight || "#2196F3",
        paddingVertical: adminTheme.spacing.sm,
        paddingHorizontal: adminTheme.spacing.md,
        borderRadius: adminTheme.radius.sm,
        marginTop: adminTheme.spacing.md,
    },
    editButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: adminTheme.spacing.md,
    },
    modalContent: {
        backgroundColor: adminTheme.colors.surface,
        borderRadius: adminTheme.radius.lg,
        width: "100%",
        maxWidth: 400,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: adminTheme.spacing.md,
        paddingHorizontal: adminTheme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: adminTheme.colors.borderLight,
    },
    modalTitle: {
        fontSize: adminTheme.typography.fontSize.lg,
        fontWeight: "700",
        color: adminTheme.colors.text,
    },
    modalBody: {
        padding: adminTheme.spacing.lg,
        gap: adminTheme.spacing.md,
    },
    modalProductName: {
        fontSize: adminTheme.typography.fontSize.base,
        fontWeight: "600",
        color: adminTheme.colors.text,
    },
    modalLabel: {
        fontSize: adminTheme.typography.fontSize.sm,
        color: adminTheme.colors.textSecondary,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: adminTheme.colors.borderLight,
        borderRadius: adminTheme.radius.sm,
        paddingVertical: 12,
        paddingHorizontal: adminTheme.spacing.md,
        fontSize: adminTheme.typography.fontSize.base,
        color: adminTheme.colors.text,
    },
    modalFooter: {
        flexDirection: "row",
        gap: adminTheme.spacing.md,
        padding: adminTheme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: adminTheme.colors.borderLight,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: adminTheme.radius.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: adminTheme.colors.borderLight,
    },
    cancelButtonText: {
        color: adminTheme.colors.text,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.base,
    },
    saveButton: {
        backgroundColor: adminTheme.colors.primaryLight || "#2196F3",
    },
    saveButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.base,
    },
});

export default StockAlerts;
