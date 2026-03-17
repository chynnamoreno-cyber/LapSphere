import React, { useEffect, useMemo, useState } from "react";
import { Image, View, StyleSheet, Text, ScrollView, TouchableOpacity } from "react-native";
import { Surface } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductById } from "../../Redux/Actions/productActions";
import { fetchReviewsByProduct } from "../../Redux/Actions/reviewActions";
import { sanitizeProfanity } from "../../assets/common/profanityFilter";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const SingleProduct = ({ route }) => {
    const dispatch = useDispatch();
    const [item] = useState(route.params?.item || {});
    const [sortBy, setSortBy] = useState("date_desc");
    const [ratingFilter, setRatingFilter] = useState(0);
    const [withMedia, setWithMedia] = useState(false);

    const productId = useMemo(() => item?.id || item?._id, [item]);
    const product = useSelector((state) => {
        const key = String(productId || "");
        return state.products?.detailsById?.[key] || item || {};
    });
    const reviews = useSelector((state) => {
        const key = String(productId || "");
        return state.reviews?.byProductId?.[key] || [];
    });

    useEffect(() => {
        if (!productId) return;

        dispatch(fetchProductById(productId));
    }, [productId, dispatch]);

    useEffect(() => {
        if (!productId) return;

        dispatch(
            fetchReviewsByProduct({
                productId,
                sort: sortBy,
                rating: ratingFilter,
                withMedia,
            })
        );
    }, [productId, sortBy, ratingFilter, withMedia, dispatch]);

    const renderStars = (rating) => {
        const starCount = Math.max(1, Math.min(5, Number(rating || 0)));
        const rounded = Math.round(starCount);
        return "★".repeat(rounded) + "☆".repeat(5 - rounded);
    };

    return (
        <Surface style={styles.container}>
            <ScrollView style={{ marginBottom: 80, padding: 5 }}>
                <View>
                    <Image
                        source={{
                            uri: product.image ? product.image : FALLBACK_IMAGE,
                        }}
                        resizeMode="contain"
                        style={styles.image}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.contentHeader}>{product.name}</Text>
                    <Text style={styles.contentText}>{product.brand}</Text>
                    <Text style={styles.ratingText}>
                        {Number(product.rating || 0).toFixed(1)} / 5 ({product.numReviews || 0} reviews)
                    </Text>
                </View>
                <View style={styles.availabilityContainer}>
                    <Text>{product.description}</Text>
                </View>

                <View style={styles.reviewFilterBox}>
                    <Text style={styles.filterTitle}>Reviews</Text>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.filterChip, sortBy === "date_desc" && styles.filterChipActive]}
                            onPress={() => setSortBy("date_desc")}
                        >
                            <Text style={[styles.filterChipText, sortBy === "date_desc" && styles.filterChipTextActive]}>Newest</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, sortBy === "date_asc" && styles.filterChipActive]}
                            onPress={() => setSortBy("date_asc")}
                        >
                            <Text style={[styles.filterChipText, sortBy === "date_asc" && styles.filterChipTextActive]}>Oldest</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, withMedia && styles.filterChipActive]}
                            onPress={() => setWithMedia((prev) => !prev)}
                        >
                            <Text style={[styles.filterChipText, withMedia && styles.filterChipTextActive]}>With Media</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterRow}>
                        {[0, 5, 4, 3, 2, 1].map((value) => (
                            <TouchableOpacity
                                key={value}
                                style={[styles.starChip, ratingFilter === value && styles.filterChipActive]}
                                onPress={() => setRatingFilter(value)}
                            >
                                <Text style={[styles.filterChipText, ratingFilter === value && styles.filterChipTextActive]}>{value === 0 ? "All" : `${value}★`}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.reviewsContainer}>
                    {reviews.length === 0 ? (
                        <Text style={styles.emptyReviews}>No reviews yet for selected filter.</Text>
                    ) : (
                        reviews.map((review) => (
                            <View key={review.id || review._id} style={styles.reviewCard}>
                                <View style={styles.reviewHeaderRow}>
                                    <Text style={styles.reviewAuthor}>{review.user?.name || "User"}</Text>
                                    <Text style={styles.reviewDate}>
                                        {String(review.createdAt || "").split("T")[0]}
                                    </Text>
                                </View>
                                <Text style={styles.reviewStars}>{renderStars(review.rating)}</Text>
                                <Text style={styles.reviewComment}>{sanitizeProfanity(review.comment || "")}</Text>

                                {Array.isArray(review.images) && review.images.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                                        {review.images.map((uri, idx) => (
                                            <Image key={`${review.id || review._id}-${idx}`} source={{ uri }} style={styles.reviewImage} />
                                        ))}
                                    </ScrollView>
                                ) : null}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "relative",
        height: "100%",
    },
    image: {
        width: "100%",
        height: 250,
    },
    contentContainer: {
        marginTop: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    contentHeader: {
        fontWeight: "bold",
        marginBottom: 20,
    },
    contentText: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 20,
    },
    ratingText: {
        color: "#444",
        marginTop: -10,
        marginBottom: 8,
        fontWeight: "600",
    },
    availabilityContainer: {
        marginBottom: 20,
        alignItems: "center",
        paddingHorizontal: 14,
    },
    reviewFilterBox: {
        marginHorizontal: 10,
        backgroundColor: "#f1f1f1",
        borderRadius: 10,
        padding: 10,
    },
    filterTitle: {
        fontWeight: "700",
        fontSize: 16,
        marginBottom: 8,
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 6,
    },
    filterChip: {
        backgroundColor: "#ddd",
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 6,
    },
    starChip: {
        backgroundColor: "#ddd",
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 6,
    },
    filterChipActive: {
        backgroundColor: "#111",
    },
    filterChipText: {
        color: "#222",
        fontWeight: "600",
    },
    filterChipTextActive: {
        color: "#fff",
    },
    reviewsContainer: {
        marginHorizontal: 10,
        marginTop: 10,
        marginBottom: 20,
    },
    reviewCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        elevation: 1,
    },
    reviewHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    reviewAuthor: {
        fontWeight: "700",
        color: "#222",
    },
    reviewDate: {
        color: "#666",
        fontSize: 12,
    },
    reviewStars: {
        color: "#f9a825",
        fontWeight: "700",
        marginBottom: 6,
    },
    reviewComment: {
        color: "#333",
        marginBottom: 8,
    },
    mediaRow: {
        marginTop: 4,
    },
    reviewImage: {
        width: 96,
        height: 96,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: "#ddd",
    },
    emptyReviews: {
        color: "#666",
        textAlign: "center",
        marginVertical: 12,
    },
});

export default SingleProduct;
