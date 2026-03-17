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

const NotificationCenter = () => {
    const navigation = useNavigation();
    const context = React.useContext(AuthGlobal);
    const [notifications, setNotifications] = useState([]);
    const [openedNotifications, setOpenedNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadNotifications = useCallback(async () => {
        setRefreshing(true);
        try {
            // Get delivered notifications from the system tray
            const delivered = await Notifications.getPresentedNotificationsAsync();
            const mapped = delivered.map((n) => ({
                id: n.request.identifier,
                title: n.request.content.title || "Notification",
                body: n.request.content.body || "",
                date: n.date ? new Date(n.date) : new Date(),
                data: n.request.content.data || {},
            }));
            // Sort newest first
            mapped.sort((a, b) => b.date - a.date);
            setNotifications(mapped);
            setOpenedNotifications((prevOpened) => {
                if (!Array.isArray(prevOpened) || prevOpened.length === 0) return prevOpened;
                const activeIds = new Set(mapped.map((item) => item.id));
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
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => openNotification(item)}>
            <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={24} color="#e91e63" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>
                    {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
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
    openedTitle: { color: "#444" },
    body: { fontSize: 13, color: "#333", marginBottom: 4 },
    date: { fontSize: 11, color: "#666" },
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
