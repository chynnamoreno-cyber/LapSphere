import React, { useEffect, useState, useContext } from "react";
import { Text, View, Button, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import FormContainer from "../../Shared/FormContainer";
import Input from "../../Shared/Input";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import Toast from "react-native-toast-message";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import { Surface } from "react-native-paper";

const Checkout = () => {
    const [user, setUser] = useState("");
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileReady, setProfileReady] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [address, setAddress] = useState("");
    const [address2, setAddress2] = useState("");
    const [city, setCity] = useState("");
    const [zip, setZip] = useState("");
    const [country, setCountry] = useState("Philippines");
    const [phone, setPhone] = useState("");
    const navigation = useNavigation();
    const cartItems = useSelector((s) => s.cartItems);
    const context = useContext(AuthGlobal);

    const isProfileComplete = (profile) => {
        return !!(
            String(profile?.phone || "").trim()
            && String(profile?.deliveryAddress1 || "").trim()
            && String(profile?.deliveryCity || "").trim()
            && String(profile?.deliveryZip || "").trim()
            && String(profile?.deliveryCountry || "").trim()
        );
    };

    useEffect(() => {
        setOrderItems(cartItems);
        setLoadingProfile(true);

        if (context.stateUser.isAuthenticated) {
            setUser(context.stateUser.user.userId);
            getJwtToken()
                .then((jwt) => {
                    if (!jwt) return;
                    return axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                        headers: { Authorization: `Bearer ${jwt}` },
                    });
                })
                .then((response) => {
                    const profile = response?.data;
                    if (!profile) {
                        setProfileReady(false);
                        return;
                    }

                    if (profile.phone) setPhone(profile.phone);
                    if (profile.deliveryAddress1) setAddress(profile.deliveryAddress1);
                    if (profile.deliveryAddress2) setAddress2(profile.deliveryAddress2);
                    if (profile.deliveryCity) setCity(profile.deliveryCity);
                    if (profile.deliveryZip) setZip(profile.deliveryZip);
                    if (profile.deliveryCountry) setCountry(profile.deliveryCountry);

                    const complete = isProfileComplete(profile);
                    setProfileReady(complete);
                    if (!complete) {
                        Toast.show({
                            topOffset: 60,
                            type: "error",
                            text1: "Complete your profile first",
                            text2: "Add phone and delivery address in User Profile",
                        });
                    }
                })
                .catch(() => {
                    setProfileReady(false);
                })
                .finally(() => setLoadingProfile(false));
        } else {
            navigation.navigate("User", { screen: "Login" });
            Toast.show({ topOffset: 60, type: "error", text1: "Please login to checkout" });
            setLoadingProfile(false);
        }
        return () => setOrderItems([]);
    }, [cartItems, context.stateUser.isAuthenticated]);

    const checkOut = () => {
        if (loadingProfile) {
            Toast.show({ topOffset: 60, type: "info", text1: "Loading profile..." });
            return;
        }

        if (!profileReady) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Profile required before checkout",
                text2: "Please complete delivery details in User Profile",
            });
            navigation.navigate("User", { screen: "User Profile" });
            return;
        }

        navigation.navigate("Payment", {
            order: { city, country, dateOrdered: Date.now(), orderItems, phone, shippingAddress1: address, shippingAddress2: address2, status: "pending", user, zip },
        });
    };

    return (
        <KeyboardAwareScrollView 
            viewIsInsideTabBar 
            extraHeight={200} 
            enableOnAndroid 
            style={styles.scrollContainer}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Order Checkout</Text>
                    <Text style={styles.subtitle}>Review your shipping information</Text>
                </View>

                {/* Shipping Address Card */}
                <Surface style={styles.card}>
                    <Text style={styles.cardTitle}>Shipping Address</Text>
                    <View style={styles.divider} />
                    <View style={styles.addressContent}>
                        <View style={styles.addressField}>
                            <Text style={styles.label}>Phone</Text>
                            <Text style={styles.value}>{phone || "Not provided"}</Text>
                        </View>
                        <View style={styles.addressField}>
                            <Text style={styles.label}>Address Line 1</Text>
                            <Text style={styles.value}>{address || "Not provided"}</Text>
                        </View>
                        {address2 && (
                            <View style={styles.addressField}>
                                <Text style={styles.label}>Address Line 2</Text>
                                <Text style={styles.value}>{address2}</Text>
                            </View>
                        )}
                        <View style={styles.twoColumnRow}>
                            <View style={styles.column}>
                                <Text style={styles.label}>City</Text>
                                <Text style={styles.value}>{city || "Not provided"}</Text>
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.label}>Zip Code</Text>
                                <Text style={styles.value}>{zip || "Not provided"}</Text>
                            </View>
                        </View>
                        <View style={styles.addressField}>
                            <Text style={styles.label}>Country</Text>
                            <Text style={styles.value}>{country || "Philippines"}</Text>
                        </View>
                    </View>
                </Surface>

                {/* Order Items Summary */}
                {orderItems.length > 0 && (
                    <Surface style={styles.card}>
                        <Text style={styles.cardTitle}>Order Summary</Text>
                        <View style={styles.divider} />
                        {orderItems.slice(0, 3).map((item, idx) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                                </View>
                                <Text style={styles.itemPrice}>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</Text>
                            </View>
                        ))}
                        {orderItems.length > 3 && (
                            <Text style={styles.moreItems}>+{orderItems.length - 3} more items</Text>
                        )}
                    </Surface>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    {!profileReady ? (
                        <>
                            <Surface style={[styles.warningBox, styles.card]}>
                                <Text style={styles.warningText}>⚠ Please complete your profile before checkout</Text>
                            </Surface>
                            <TouchableOpacity
                                style={styles.buttonPrimary}
                                onPress={() => navigation.navigate("User", { screen: "User Profile" })}
                            >
                                <Text style={styles.buttonText}>Go to Profile</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.buttonPrimary, loadingProfile && styles.buttonDisabled]}
                                onPress={checkOut}
                                disabled={loadingProfile}
                            >
                                <Text style={styles.buttonText}>Continue to Payment</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.buttonSecondary}
                                onPress={() => navigation.navigate("User", { screen: "User Profile" })}
                            >
                                <Text style={styles.buttonTextSecondary}>Edit Delivery Details</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        backgroundColor: "#f5f5f5",
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
        paddingBottom: 16,
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
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginBottom: 12,
    },
    addressContent: {
        gap: 12,
    },
    addressField: {
        marginBottom: 4,
    },
    twoColumnRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    column: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 15,
        color: "#1a1a1a",
        fontWeight: "500",
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    itemInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    itemQty: {
        fontSize: 12,
        color: "#666",
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1e40af",
        minWidth: 70,
        textAlign: "right",
    },
    moreItems: {
        fontSize: 12,
        color: "#999",
        textAlign: "center",
        marginTop: 8,
        fontStyle: "italic",
    },
    warningBox: {
        backgroundColor: "#fef3c7",
        borderLeftWidth: 4,
        borderLeftColor: "#f59e0b",
        paddingVertical: 12,
    },
    warningText: {
        color: "#92400e",
        fontSize: 14,
        fontWeight: "600",
    },
    buttonContainer: {
        marginTop: 12,
    },
    buttonRow: {
        marginBottom: 12,
        borderRadius: 8,
        overflow: "hidden",
    },
    buttonPrimary: {
        backgroundColor: "#1e40af",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    buttonSecondary: {
        backgroundColor: "#f3f4f6",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#d1d5db",
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    buttonText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 16,
    },
    buttonTextSecondary: {
        color: "#374151",
        fontWeight: "700",
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});

export default Checkout;
