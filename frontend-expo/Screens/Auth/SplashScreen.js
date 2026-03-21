/**
 * Splash screen: LapSphere logo - Premium laptop e-commerce. Shown when app opens.
 * Flow: open app -> splash logo -> onboarding or login
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "hasSeenOnboarding";

const SplashScreen = ({ navigation }) => {
    useEffect(() => {
        const run = async () => {
            await new Promise((r) => setTimeout(r, 2500));
            const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
            navigation.replace(seen === "true" ? "Login" : "Onboarding");
        };
        run();
    }, [navigation]);

    return (
        <View style={styles.root}>
            <View style={styles.circleLarge} />
            <View style={styles.circleSmall} />

            <View style={styles.card}>
                <View style={styles.logoRow}>
                    <View style={styles.logoBox}>
                        <MaterialCommunityIcons name="laptop" size={42} color="#e5f4ff" />
                    </View>
                    <View style={styles.brandTextWrap}>
                        <Text style={styles.brandName}>LapSphere</Text>
                        <Text style={styles.brandTag}>Midnight Laptop & Gear Store</Text>
                    </View>
                </View>

                <View style={styles.promoBlock}>
                    <Text style={styles.promoTitle}>Curated laptops, monitors, and accessories.</Text>
                    <Text style={styles.promoSubtitle}>
                        Build your perfect workstation with performance-focused gear.
                    </Text>
                </View>

                <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Loading your LapSphere workspace…</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#020617", // deep midnight blue
        alignItems: "center",
        justifyContent: "center",
    },
    circleLarge: {
        position: "absolute",
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: "#0b1120",
        top: -80,
        right: -40,
        opacity: 0.9,
    },
    circleSmall: {
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "#1d4ed8",
        bottom: -40,
        left: -20,
        opacity: 0.4,
    },
    card: {
        width: "82%",
        borderRadius: 32,
        backgroundColor: "#020617",
        paddingHorizontal: 24,
        paddingVertical: 26,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.55,
        shadowRadius: 40,
        elevation: 18,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.4)",
    },
    logoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: "#1d4ed8",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#1d4ed8",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 10,
    },
    brandTextWrap: {
        marginLeft: 14,
    },
    brandName: {
        fontSize: 24,
        fontWeight: "800",
        color: "#e5f4ff",
        letterSpacing: 0.7,
    },
    brandTag: {
        marginTop: 4,
        fontSize: 12,
        color: "#9ca3af",
        fontWeight: "500",
    },
    promoBlock: {
        marginTop: 4,
        marginBottom: 22,
    },
    promoTitle: {
        fontSize: 14,
        color: "#e5f4ff",
        fontWeight: "600",
        lineHeight: 20,
    },
    promoSubtitle: {
        marginTop: 6,
        fontSize: 13,
        color: "#9ca3af",
        lineHeight: 19,
    },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#0b1120",
        alignSelf: "flex-start",
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#22c55e",
        marginRight: 8,
    },
    statusText: {
        fontSize: 12,
        color: "#e5f4ff",
        fontWeight: "500",
    },
});

export default SplashScreen;
