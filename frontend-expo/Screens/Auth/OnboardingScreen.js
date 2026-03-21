/**
 * Onboarding: 3 intro slides before login/signup.
 * Flow: Skip or Get Started -> mark seen -> go to Login
 */
import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import Swiper from "react-native-swiper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const ONBOARDING_KEY = "hasSeenOnboarding";

const slides = [
    {
        icon: "laptop-outline",
        title: "Welcome to\nLapSphere",
        subtitle: "Your midnight hub for premium laptops,\naccessories, and performance upgrades.",
    },
    {
        icon: "flash-outline",
        title: "Built for\nPower Users",
        subtitle: "Tuned for creators, gamers, and pros\nwho need reliable performance all day.",
    },
    {
        icon: "star-outline",
        title: "Shop Smarter\nWith LapSphere",
        subtitle: "Compare, customize, and upgrade your\nsetup with curated laptop essentials.",
        isLast: true,
    },
];


const OnboardingScreen = ({ navigation }) => {
    const [index, setIndex] = useState(0);
    const swiperRef = useRef(null);

    const markSeenAndGoToLogin = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
        navigation.replace("Login");
    };

    const handlePrimaryPress = () => {
        if (index === slides.length - 1) {
            markSeenAndGoToLogin();
        } else {
            swiperRef.current?.scrollBy(1);
        }
    };

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <Text style={styles.brandTitle}>LapSphere</Text>
                <View style={styles.brandBadge}>
                    <Ionicons name="sparkles-outline" size={16} color="#e5f4ff" />
                    <Text style={styles.brandBadgeText}>Laptop & Gear Store</Text>
                </View>
            </View>

            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={markSeenAndGoToLogin}
                >
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                <Swiper
                    ref={swiperRef}
                    loop={false}
                    onIndexChanged={setIndex}
                    dotStyle={styles.dot}
                    activeDotStyle={styles.activeDot}
                    paginationStyle={styles.pagination}
                >
                    {slides.map((slide, i) => (
                        <View key={i} style={styles.slide}>
                            <View style={styles.illustrationCard}>
                                <View style={styles.iconCircle}>
                                    <Ionicons
                                        name={slide.icon}
                                        size={64}
                                        color="#e5f4ff"
                                    />
                                </View>
                            </View>
                            {slide.title ? (
                                <Text style={styles.title}>{slide.title}</Text>
                            ) : null}
                            {slide.subtitle ? (
                                <Text style={styles.subtitle}>{slide.subtitle}</Text>
                            ) : null}
                        </View>
                    ))}
                </Swiper>

                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handlePrimaryPress}
                >
                    <Text style={styles.primaryBtnText}>
                        {index === slides.length - 1 ? "Get Started" : "Next"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#020617", // midnight blue background
        paddingTop: 64,
        paddingHorizontal: 20,
    },
    header: {
        marginBottom: 16,
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: "800",
        color: "#e5f4ff",
        letterSpacing: 0.6,
    },
    brandBadge: {
        marginTop: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(148, 163, 184, 0.24)",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    brandBadgeText: {
        fontSize: 12,
        color: "#e5f4ff",
        fontWeight: "600",
    },
    container: {
        flex: 1,
        marginTop: 8,
        backgroundColor: "#0b1120",
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 32,
        shadowColor: "#020617",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 10,
    },
    skipBtn: {
        position: "absolute",
        top: 24,
        right: 20,
        zIndex: 10,
    },
    skipText: { fontSize: 15, color: "#64748b", fontWeight: "600" },
    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    illustrationCard: {
        width: "100%",
        borderRadius: 24,
        backgroundColor: "#020617",
        paddingVertical: 30,
        marginBottom: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.45)",
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        color: "#e5f4ff",
        textAlign: "center",
        lineHeight: 34,
    },
    subtitle: {
        fontSize: 15,
        color: "#94a3b8",
        textAlign: "center",
        marginTop: 12,
        lineHeight: 22,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#1f2937",
    },
    activeDot: {
        width: 24,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#1d4ed8",
    },
    pagination: { bottom: 96 },
    primaryBtn: {
        position: "absolute",
        bottom: 32,
        left: 24,
        right: 24,
        height: 52,
        backgroundColor: "#2563eb",
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#1d4ed8",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600",
    },
});

export default OnboardingScreen;
