import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { getNotificationTarget } from "../../assets/common/notificationRouting";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";

const NotificationCenter = () => {
    const navigation = useNavigation();
    const context = React.useContext(AuthGlobal);
    const [notifications, setNotifications] = useState([]);
    const [openedNotifications, setOpenedNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadNotifications = useCallback(async () => {
        setRefreshing(true);
        try {
            // First, get delivered push notifications from the system tray
            const delivered = await Notifications.getPresentedNotificationsAsync();
            const pushNotifs = delivered.map((n) => ({
                id: n.request.identifier,
                title: n.request.content.title || "Notification",
                body: n.request.content.body || "",
                date: n.date ? new Date(n.date) : new Date(),
                data: n.request.content.data || {},
                source: "push",
            }));

            // Fetch notifications from backend API
            let dbNotifs = [];
            try {
                const token = await getJwtToken();
                if (token) {
                    const response = await axios.get(
                        `${baseURL}notifications?limit=50&page=1`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    dbNotifs = (response.data?.data || []).map((n) => ({
                        id: n.id || n._id,
                        title: n.title,
                        body: n.message,
                        date: new Date(n.createdAt),
                        data: {
                            ...n.data,
                            type: n.type,
                            orderId: n.orderId?.id || n.orderId?._id,
                            orderStatus: n.orderStatus,
                        },
                        dbId: n.id || n._id,
                        read: n.read,
                        source: "database",
                    }));
                }
            } catch (apiErr) {
                console.log("Error fetching database notifications:", apiErr.message);
            }

            // Combine and sort by date (newest first)
            const combined = [...dbNotifs, ...pushNotifs];
            combined.sort((a, b) => new Date(b.date) - new Date(a.date));

            setNotifications(combined);
            setOpenedNotifications((prevOpened) => {
                if (!Array.isArray(prevOpened) || prevOpened.length === 0) return prevOpened;
                const activeIds = new Set(combined.map((item) => item.id));
                return prevOpened.filter((item) => !activeIds.has(item.id));
            });
        } catch (err) {
            console.log("Error loading notifications:", err.message);
        }
        setRefreshing(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [loadNotifications])
    );

    const clearAll = async () => {
        await Notifications.dismissAllNotificationsAsync();
        setNotifications([]);
        setOpenedNotifications([]);
    };

    const openNotification = (item, options = {}) => {
        if (!item) return;
        const shouldMarkOpened = options.markOpened !== false;

        if (shouldMarkOpened && item?.id) {
            Notifications.dismissNotificationAsync(item.id).catch(() => {});
            setNotifications((prev) => prev.filter((entry) => entry.id !== item.id));
            setOpenedNotifications((prev) => {
                const filtered = prev.filter((entry) => entry.id !== item.id);
                return [{ ...item, openedAt: new Date() }, ...filtered];
            });
        }

        const data = item?.data || {};
        const isAdmin = context?.stateUser?.user?.isAdmin === true;

        // Handle order status notifications - navigate to OrderDetails
        if (data.type === "order_status" && data.orderId) {
            navigation.navigate("Order Details", { orderId: data.orderId });
            return;
        }

        const target = getNotificationTarget({ data, isAdmin });

        if (!target) {
            navigation.navigate("Notification Detail", {
                notification: {
                    title: item.title,
                    body: item.body,
                    date: item.date,
                    data,
                },
            });
            return;
        }

        if (target.tab === "Admin") {
            navigation.getParent()?.navigate("Admin", {
                screen: target.stackScreen,
                params: target.params,
            });
            return;
        }

        if (target.stackScreen === "Notification Detail") {
            navigation.navigate("Notification Detail", {
                notification: {
                    title: item.title,
                    body: item.body,
                    date: item.date,
                    data,
                },
            });
            return;
        }

        navigation.navigate(target.stackScreen, target.params);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={[
                styles.card, 
                item.source === "database" && item.read && styles.readCard,
            ]} 
            activeOpacity={0.8} 
            onPress={() => openNotification(item)}
        >
            <View style={styles.iconContainer}>
                {item.data?.type === "order_status" ? (
                    <Ionicons name="cube-outline" size={24} color={item.read ? "#999" : "#1e40af"} />
                ) : (
                    <Ionicons name="notifications" size={24} color={item.read ? "#999" : "#e91e63"} />
                )}
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, item.read && styles.readText]}>{item.title}</Text>
                <Text style={[styles.body, item.read && styles.readText]}>{item.body}</Text>
                <Text style={styles.date}>
                    {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
                </Text>
            </View>
            {item.source === "database" && !item.read && <View style={styles.unreadIndicator} />}
            <Ionicons name="chevron-forward" size={18} color={item.read ? "#ccc" : "#999"} />
        </TouchableOpacity>
    );

    const renderOpenedItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, styles.openedCard]}
            activeOpacity={0.8}
            onPress={() => openNotification(item, { markOpened: false })}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="mail-open-outline" size={22} color="#666" />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, styles.openedTitle]}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>
                    Opened: {(item.openedAt ? new Date(item.openedAt) : item.date).toLocaleDateString()} {(item.openedAt ? new Date(item.openedAt) : item.date).toLocaleTimeString()}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {(notifications.length > 0 || openedNotifications.length > 0) && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
                    <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
            )}
            {notifications.length === 0 && openedNotifications.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No notifications yet</Text>
                    <Text style={styles.emptySubtext}>
                        Notifications will appear here when you receive stock alerts, order updates, etc.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => `active-${item.id}`}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />
                    }
                    ListHeaderComponent={
                        notifications.length > 0 ? (
                            <Text style={styles.sectionTitle}>Unread / Active Notifications</Text>
                        ) : null
                    }
                    ListFooterComponent={
                        openedNotifications.length > 0 ? (
                            <View style={styles.openedSection}>
                                <Text style={styles.sectionTitle}>Recently Opened</Text>
                                <FlatList
                                    data={openedNotifications}
                                    keyExtractor={(item) => `opened-${item.id}`}
                                    renderItem={renderOpenedItem}
                                    scrollEnabled={false}
                                />
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    clearBtn: {
        alignSelf: "flex-end",
        padding: 12,
        paddingBottom: 4,
    },
    clearText: { color: "#e91e63", fontWeight: "600" },
    sectionTitle: {
        marginHorizontal: 12,
        marginTop: 6,
        marginBottom: 6,
        color: "#555",
        fontWeight: "700",
        fontSize: 12,
        textTransform: "uppercase",
    },
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        marginHorizontal: 12,
        marginVertical: 4,
        padding: 14,
        borderRadius: 10,
        elevation: 2,
    },
    readCard: {
        backgroundColor: "#fafafa",
        opacity: 0.85,
    },
    openedCard: {
        opacity: 0.9,
        backgroundColor: "#fafafa",
    },
    iconContainer: {
        width: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    textContainer: { flex: 1 },
    title: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
    readText: { color: "#888" },
    openedTitle: { color: "#444" },
    body: { fontSize: 13, color: "#333", marginBottom: 4 },
    date: { fontSize: 11, color: "#666" },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#e91e63",
        marginRight: 8,
        marginTop: 6,
    },
    openedSection: {
        marginTop: 8,
        paddingBottom: 10,
    },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 120,
        paddingHorizontal: 40,
    },
    emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
    emptySubtext: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 8 },
});

export default NotificationCenter;
