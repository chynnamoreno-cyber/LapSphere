import React, { useState, useEffect } from "react";
import { Image, StyleSheet, Dimensions, View, ScrollView, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import Swiper from "react-native-swiper";

var { width } = Dimensions.get("window");

const BANNER_HEIGHT = width * 0.45;

/**
 * Banner with carousel showing promotional images
 * Falls back to gradient placeholder if images unavailable
 */
const Banner = () => {
    const [bannerData, setBannerData] = useState([]);
    const [hasError, setHasError] = useState([false, false, false]);

    useEffect(() => {
        // Try to load local carousel images, but have fallbacks
        const images = [
            require("../assets/images/carousel1-sample.png"),
            require("../assets/images/carousel2-sample.png"),
            require("../assets/images/carousel3-sample.png"),
        ];
        setBannerData(images);
        return () => setBannerData([]);
    }, []);

    const handleImageError = (index) => {
        const newErrors = [...hasError];
        newErrors[index] = true;
        setHasError(newErrors);
    };

    const renderPlaceholder = () => (
        <View style={styles.placeholderBanner}>
            <View style={styles.placeholderContent}>
                <Text style={styles.placeholderText}>Premium Laptops</Text>
                <Text style={styles.placeholderSubtext}>Exclusive Deals</Text>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.swiperContainer}>
                <Swiper
                    style={{ height: BANNER_HEIGHT }}
                    showButtons={false}
                    autoplay={true}
                    autoplayTimeout={4}
                    dotColor="rgba(255,255,255,0.5)"
                    activeDotColor="#fff"
                    paginationStyle={styles.pagination}
                >
                    {bannerData.map((item, index) => (
                        <View key={index} style={styles.slide}>
                            {hasError[index] ? (
                                renderPlaceholder()
                            ) : (
                                <Image
                                    style={styles.imageBanner}
                                    resizeMode="cover"
                                    source={item}
                                    onError={() => handleImageError(index)}
                                />
                            )}
                        </View>
                    ))}
                </Swiper>
                <View style={{ height: 16 }} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    swiperContainer: {
        width: width,
        alignItems: "center",
        marginTop: 0,
        marginBottom: 8,
    },
    slide: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
    },
    imageBanner: {
        height: BANNER_HEIGHT,
        width: width - 16,
        borderRadius: 16,
        marginHorizontal: 8,
    },
    pagination: {
        bottom: 12,
    },
    placeholderBanner: {
        height: BANNER_HEIGHT,
        width: width - 16,
        borderRadius: 16,
        marginHorizontal: 8,
        backgroundColor: "#1e40af",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    placeholderContent: {
        alignItems: "center",
        gap: 8,
    },
    placeholderText: {
        fontSize: 28,
        fontWeight: "800",
        color: "#fff",
    },
    placeholderSubtext: {
        fontSize: 16,
        color: "rgba(255,255,255,0.9)",
        fontWeight: "600",
    },
});

export default Banner;
