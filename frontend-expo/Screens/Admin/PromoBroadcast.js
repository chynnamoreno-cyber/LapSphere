import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import { adminTheme } from "../../assets/common/adminTheme";
import { Picker } from "@react-native-picker/picker";
import { useDispatch } from "react-redux";
import { fetchProducts } from "../../Redux/Actions/productActions";

const PromoBroadcast = () => {
    const dispatch = useDispatch();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [discountPercent, setDiscountPercent] = useState("");
    const [categoryId, setCategoryId] = useState("all");
    const [durationDays, setDurationDays] = useState("0");
    const [durationHours, setDurationHours] = useState("24");
    const [isSending, setIsSending] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [categories, setCategories] = useState([]);
    const [activePromos, setActivePromos] = useState([]);
    const [loadingPromos, setLoadingPromos] = useState(false);

    const loadActivePromos = async () => {
        try {
            setLoadingPromos(true);
            const jwt = (await getJwtToken()) || "";
            console.log("[PromoBroadcast] Loading active promos with token:", jwt ? "✓ present" : "✗ missing");
            const response = await axios.get(
                `${baseURL}promos/admin/active`,
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            console.log("[PromoBroadcast] Active promos response:", response.data);
            setActivePromos(response.data || []);
        } catch (error) {
            console.log("[PromoBroadcast] Error loading active promos:", error.message);
            console.log("[PromoBroadcast] Error details:", error.response?.status, error.response?.data);
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Error loading active promos",
                text2: error.response?.data?.message || error.message,
            });
        } finally {
            setLoadingPromos(false);
        }
    };

    useEffect(() => {
        axios
            .get(`${baseURL}categories`)
            .then((res) => setCategories(res.data || []))
            .catch(() => setCategories([]));
        
        loadActivePromos();
        // Refresh active promos every 30 seconds
        const interval = setInterval(loadActivePromos, 30000);
        return () => clearInterval(interval);
    }, []);

    const sendPromo = async () => {
        const cleanTitle = String(title || "").trim();
        const cleanMessage = String(message || "").trim();

        if (!cleanTitle || !cleanMessage) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Title and message are required",
            });
            return;
        }

        try {
            setIsSending(true);
            const jwt = (await getJwtToken()) || "";
            const response = await axios.post(
                `${baseURL}promos/broadcast`,
                {
                    title: cleanTitle,
                    message: cleanMessage,
                    discountPercent: discountPercent === "" ? undefined : discountPercent,
                    categoryId: categoryId === "all" ? undefined : categoryId,
                    durationDays: durationDays === "" ? 0 : Number(durationDays),
                    durationHours: durationHours === "" ? 24 : Number(durationHours),
                },
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const sent = Number(response?.data?.sent || 0);
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: "Promo broadcast sent",
                text2: `Recipients reached: ${sent}`,
            });
            // Refresh product prices in the store so Home immediately reflects promo changes.
            dispatch(fetchProducts());
            setTitle("");
            setMessage("");
            setDiscountPercent("");
            setDurationDays("0");
            setDurationHours("24");
            setCategoryId("all");
            await loadActivePromos();
        } catch (error) {
            const apiMessage = error?.response?.data?.message || "Failed to send promo broadcast";
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: apiMessage,
            });
        } finally {
            setIsSending(false);
        }
    };

    const cancelPromo = async () => {
        if (categoryId === "all") {
            Toast.show({
                topOffset: 60,
                type: "warning",
                text1: "Select a specific category to cancel",
                text2: "Or press button again to cancel ALL promos",
            });
            return;
        }

        const categoryName = categories.find(c => (c.id || c._id) === categoryId)?.name || "All";

        Alert.alert(
            "Cancel Promo",
            `End promo for ${categoryName}? Prices will revert to original.`,
            [
                { text: "Nevermind", style: "cancel" },
                {
                    text: "Cancel Promo",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsCanceling(true);
                            const jwt = (await getJwtToken()) || "";
                            const response = await axios.delete(
                                `${baseURL}promos/${categoryId}`,
                                {
                                    headers: { Authorization: `Bearer ${jwt}` },
                                }
                            );

                            Toast.show({
                                topOffset: 60,
                                type: "success",
                                text1: "Promo Canceled",
                                text2: `${response.data?.revertedCount || 0} products reverted to original price`,
                            });

                            dispatch(fetchProducts());
                            await loadActivePromos();
                        } catch (error) {
                            Toast.show({
                                topOffset: 60,
                                type: "error",
                                text1: "Failed to cancel promo",
                                text2: error?.response?.data?.message || error.message,
                            });
                        } finally {
                            setIsCanceling(false);
                        }
                    },
                },
            ]
        );
    };

    const quickCancelPromo = async (categoryId, categoryName) => {
        Alert.alert(
            "Quick Cancel",
            `End promo for ${categoryName}?`,
            [
                { text: "Nevermind", style: "cancel" },
                {
                    text: "Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const jwt = (await getJwtToken()) || "";
                            const response = await axios.delete(
                                `${baseURL}promos/${categoryId}`,
                                {
                                    headers: { Authorization: `Bearer ${jwt}` },
                                }
                            );

                            Toast.show({
                                topOffset: 60,
                                type: "success",
                                text1: "Promo Canceled",
                                text2: `${response.data?.revertedCount || 0} products reverted`,
                            });

                            dispatch(fetchProducts());
                            await loadActivePromos();
                        } catch (error) {
                            Toast.show({
                                topOffset: 60,
                                type: "error",
                                text1: "Failed to cancel",
                                text2: error?.response?.data?.message || error.message,
                            });
                        }
                    },
                },
            ]
        );
    };

    const timeRemaining = (expireAt) => {
        const now = new Date();
        const expiry = new Date(expireAt);
        const diffMs = expiry - now;
        
        if (diffMs <= 0) return "Expired";
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        }
        return `${hours}h ${minutes}m`;
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Ionicons name="megaphone" size={32} color={adminTheme.colors.primaryLight} />
                <View>
                    <Text style={styles.heading}>Promo Broadcast</Text>
                    <Text style={styles.subheading}>
                        Send promo push notifications to all customers
                    </Text>
                </View>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={adminTheme.colors.primaryLight} />
                <Text style={styles.infoText}>
                    Notifications will be sent to all customer devices with saved push tokens.
                </Text>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.label}>
                    <Ionicons name="text" size={16} color={adminTheme.colors.primaryLight} /> Title
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="Example: Weekend Sports Sale"
                    placeholderTextColor={adminTheme.colors.textTertiary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={80}
                />
                <Text style={styles.counter}>{title.length}/80</Text>

                <Text style={styles.label}>
                    <Ionicons name="document-text" size={16} color={adminTheme.colors.primaryLight} /> Message
                </Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Example: All ball category items are up to 20% off today"
                    placeholderTextColor={adminTheme.colors.textTertiary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={240}
                />
                <Text style={styles.counter}>{message.length}/240</Text>

                <Text style={styles.label}>
                    <Ionicons name="pricetags-outline" size={16} color={adminTheme.colors.primaryLight} /> Discount %
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="Example: 10"
                    placeholderTextColor={adminTheme.colors.textTertiary}
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                    keyboardType="numeric"
                    maxLength={3}
                />

                <Text style={styles.label}>
                    <Ionicons name="pricetags" size={16} color={adminTheme.colors.primaryLight} /> Apply to Category
                </Text>
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={categoryId} onValueChange={(v) => setCategoryId(v)} style={styles.picker}>
                        <Picker.Item label="All categories" value="all" />
                        {categories.map((c) => (
                            <Picker.Item key={c.id || c._id} label={c.name} value={c.id || c._id} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>
                    <Ionicons name="time" size={16} color={adminTheme.colors.primaryLight} /> Duration - Days
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="Example: 7"
                    placeholderTextColor={adminTheme.colors.textTertiary}
                    value={durationDays}
                    onChangeText={setDurationDays}
                    keyboardType="numeric"
                    maxLength={3}
                />

                <Text style={styles.label}>
                    <Ionicons name="time" size={16} color={adminTheme.colors.primaryLight} /> Duration - Hours
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="Example: 24"
                    placeholderTextColor={adminTheme.colors.textTertiary}
                    value={durationHours}
                    onChangeText={setDurationHours}
                    keyboardType="numeric"
                    maxLength={4}
                />
                <Text style={styles.counter}>Example: 7 days + 0 hours = 1 week</Text>
            </View>

            {/* Active Promos List */}
            <View style={styles.activePromosSection}>
                <View style={styles.activePromosHeader}>
                    <Ionicons name="flash" size={20} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.activePromosTitle}>Active Promos ({activePromos.length})</Text>
                    {loadingPromos && <ActivityIndicator size="small" color={adminTheme.colors.primaryLight} />}
                </View>
                
                {activePromos.length === 0 ? (
                    <Text style={styles.noPromosText}>No active promos running</Text>
                ) : (
                    <View>
                        {activePromos.map((promo) => (
                            <View key={promo.categoryId} style={styles.promoCard}>
                                <View style={styles.promoInfo}>
                                    <Text style={styles.promoCategoryName}>{promo.categoryName}</Text>
                                    <View style={styles.promoDetails}>
                                        <Text style={styles.promoDiscount}>
                                            <Ionicons name="pricetags" size={14} color={adminTheme.colors.success} />
                                            {" "}{promo.discountSample}% OFF
                                        </Text>
                                        <Text style={styles.promoExpiry}>
                                            <Ionicons name="time" size={14} color={adminTheme.colors.warning} />
                                            {" "}{timeRemaining(promo.minExpireAt)}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={styles.quickCancelButton}
                                    onPress={() => quickCancelPromo(promo.categoryId, promo.categoryName)}
                                >
                                    <Ionicons name="close" size={16} color={adminTheme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                onPress={sendPromo}
                disabled={isSending}
            >
                {isSending ? (
                    <ActivityIndicator color={adminTheme.colors.text} size="small" />
                ) : (
                    <>
                        <Ionicons name="send" size={18} color={adminTheme.colors.text} />
                        <Text style={styles.sendButtonText}>Send Broadcast</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.cancelButton, isCanceling && styles.cancelButtonDisabled]}
                onPress={cancelPromo}
                disabled={isCanceling}
            >
                {isCanceling ? (
                    <ActivityIndicator color={adminTheme.colors.text} size="small" />
                ) : (
                    <>
                        <Ionicons name="close-circle" size={18} color={adminTheme.colors.text} />
                        <Text style={styles.cancelButtonText}>Cancel Promo</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: adminTheme.colors.background,
        padding: adminTheme.spacing.lg,
        paddingBottom: 100,
    },
    header: {
        flexDirection: "row",
        gap: adminTheme.spacing.md,
        marginBottom: adminTheme.spacing.xl,
        alignItems: "flex-start",
    },
    heading: {
        fontSize: adminTheme.typography.fontSize.xl,
        fontWeight: "700",
        color: adminTheme.colors.text,
        marginBottom: adminTheme.spacing.sm,
    },
    subheading: {
        fontSize: adminTheme.typography.fontSize.sm,
        color: adminTheme.colors.textSecondary,
    },
    infoBox: {
        flexDirection: "row",
        backgroundColor: adminTheme.colors.surface,
        borderRadius: adminTheme.radius.md,
        padding: adminTheme.spacing.md,
        marginBottom: adminTheme.spacing.xl,
        gap: adminTheme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: adminTheme.colors.primaryLight,
    },
    infoText: {
        color: adminTheme.colors.textSecondary,
        fontSize: adminTheme.typography.fontSize.sm,
        flex: 1,
    },
    formSection: {
        marginBottom: adminTheme.spacing.xl,
    },
    label: {
        fontSize: adminTheme.typography.fontSize.base,
        fontWeight: "600",
        color: adminTheme.colors.primaryLight,
        marginBottom: adminTheme.spacing.sm,
        alignItems: "center",
    },
    input: {
        backgroundColor: adminTheme.colors.surface,
        borderWidth: 1.5,
        borderColor: adminTheme.colors.border,
        borderRadius: adminTheme.radius.md,
        paddingHorizontal: adminTheme.spacing.md,
        paddingVertical: adminTheme.spacing.md,
        marginBottom: adminTheme.spacing.sm,
        color: adminTheme.colors.text,
        fontSize: adminTheme.typography.fontSize.base,
    },
    pickerContainer: {
        width: "100%",
        borderRadius: adminTheme.radius.md,
        backgroundColor: adminTheme.colors.surface,
        borderWidth: 1.5,
        borderColor: adminTheme.colors.border,
        overflow: "hidden",
        marginBottom: adminTheme.spacing.sm,
    },
    picker: {
        color: adminTheme.colors.text,
        backgroundColor: adminTheme.colors.surface,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    counter: {
        color: adminTheme.colors.textTertiary,
        fontSize: adminTheme.typography.fontSize.xs,
        marginBottom: adminTheme.spacing.md,
        textAlign: "right",
    },
    sendButton: {
        backgroundColor: adminTheme.colors.primary,
        borderRadius: adminTheme.radius.md,
        paddingVertical: adminTheme.spacing.lg,
        paddingHorizontal: adminTheme.spacing.xl,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: adminTheme.spacing.md,
        elevation: 3,
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendButtonText: {
        color: adminTheme.colors.text,
        fontWeight: "700",
        fontSize: adminTheme.typography.fontSize.base,
    },
    cancelButton: {
        backgroundColor: adminTheme.colors.error,
        borderRadius: adminTheme.radius.md,
        paddingVertical: adminTheme.spacing.lg,
        paddingHorizontal: adminTheme.spacing.xl,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: adminTheme.spacing.md,
        elevation: 3,
        marginTop: adminTheme.spacing.md,
    },
    cancelButtonDisabled: {
        opacity: 0.6,
    },
    cancelButtonText: {
        color: adminTheme.colors.text,
        fontWeight: "700",
        fontSize: adminTheme.typography.fontSize.base,
    },
    activePromosSection: {
        backgroundColor: adminTheme.colors.surface,
        borderRadius: adminTheme.radius.md,
        padding: adminTheme.spacing.md,
        marginBottom: adminTheme.spacing.lg,
        borderWidth: 1.5,
        borderColor: adminTheme.colors.border,
    },
    activePromosHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: adminTheme.spacing.sm,
        marginBottom: adminTheme.spacing.md,
    },
    activePromosTitle: {
        fontSize: adminTheme.typography.fontSize.lg,
        fontWeight: "700",
        color: adminTheme.colors.primaryLight,
        flex: 1,
    },
    noPromosText: {
        color: adminTheme.colors.textTertiary,
        fontSize: adminTheme.typography.fontSize.sm,
        fontStyle: "italic",
        textAlign: "center",
        paddingVertical: adminTheme.spacing.md,
    },
    promoCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: adminTheme.colors.background,
        borderRadius: adminTheme.radius.sm,
        padding: adminTheme.spacing.md,
        marginBottom: adminTheme.spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: adminTheme.colors.primaryLight,
    },
    promoInfo: {
        flex: 1,
    },
    promoCategoryName: {
        fontSize: adminTheme.typography.fontSize.base,
        fontWeight: "700",
        color: adminTheme.colors.text,
        marginBottom: adminTheme.spacing.xs,
    },
    promoDetails: {
        flexDirection: "row",
        gap: adminTheme.spacing.lg,
    },
    promoDiscount: {
        color: adminTheme.colors.success,
        fontSize: adminTheme.typography.fontSize.sm,
        fontWeight: "600",
    },
    promoExpiry: {
        color: adminTheme.colors.warning,
        fontSize: adminTheme.typography.fontSize.sm,
        fontWeight: "600",
    },
    quickCancelButton: {
        backgroundColor: adminTheme.colors.error,
        borderRadius: adminTheme.radius.sm,
        padding: adminTheme.spacing.sm,
        marginLeft: adminTheme.spacing.md,
    },
});

export default PromoBroadcast;
