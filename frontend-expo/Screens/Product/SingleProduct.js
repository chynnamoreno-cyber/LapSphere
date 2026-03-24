import React, { useEffect, useMemo, useState } from "react";
import { Image, View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { Surface } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { fetchProductById } from "../../Redux/Actions/productActions";
import { fetchReviewsByProduct } from "../../Redux/Actions/reviewActions";
import { sanitizeProfanity } from "../../assets/common/profanityFilter";
import { addToCart } from "../../Redux/Actions/cartActions";

const { width } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const SingleProduct = ({ route }) => {
    const dispatch = useDispatch();
    const [item] = useState(route.params?.item || {});
    const [sortBy, setSortBy] = useState("date_desc");
    const [ratingFilter, setRatingFilter] = useState(0);
    const [withMedia, setWithMedia] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [addingToCart, setAddingToCart] = useState(false);

    const productId = useMemo(() => item?.id || item?._id, [item]);
    const product = useSelector((state) => {
        const key = String(productId || "");
        return state.products?.detailsById?.[key] || item || EMPTY_OBJECT;
    });
    const reviews = useSelector((state) => {
        const key = String(productId || "");
        return state.reviews?.byProductId?.[key] || EMPTY_ARRAY;
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

    // Get all product images (main image + additional images)
    const getProductImages = () => {
        const images = [];
        if (product.image) images.push(product.image);
        if (Array.isArray(product.images) && product.images.length > 0) {
            images.push(...product.images.filter(img => img !== product.image));
        }
        return images.length > 0 ? images : [FALLBACK_IMAGE];
    };

    const productImages = useMemo(() => getProductImages(), [product]);

    const handleAddToCart = () => {
        if (addingToCart) return;
        setAddingToCart(true);
        
        setTimeout(() => {
            dispatch(addToCart({ ...product, quantity: 1 }));
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: `${product.name} added to Cart`,
                text2: "Go to your cart to complete order",
            });
            setAddingToCart(false);
        }, 300);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
    };

    return (
        <Surface style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Image Carousel Section */}
                <View style={styles.imageCarouselContainer}>
                    <View style={styles.mainImageWrapper}>
                        <Image
                            source={{ uri: productImages[currentImageIndex] || FALLBACK_IMAGE }}
                            resizeMode="contain"
                            style={styles.mainImage}
                        />
                        {productImages.length > 1 && (
                            <>
                                <TouchableOpacity style={styles.prevButton} onPress={prevImage}>
                                    <Ionicons name="chevron-back" size={28} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.nextButton} onPress={nextImage}>
                                    <Ionicons name="chevron-forward" size={28} color="#fff" />
                                </TouchableOpacity>
                                <View style={styles.imageCounter}>
                                    <Text style={styles.imageCounterText}>
                                        {currentImageIndex + 1}/{productImages.length}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Thumbnail Gallery */}
                    {productImages.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailContainer}>
                            {productImages.map((image, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.thumbnail, currentImageIndex === index && styles.thumbnailActive]}
                                    onPress={() => setCurrentImageIndex(index)}
                                >
                                    <Image source={{ uri: image }} style={styles.thumbnailImage} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Product Info Section */}
                <View style={styles.contentContainer}>
                    <Text style={styles.contentHeader}>{product.name}</Text>
                    <Text style={styles.brandText}>{product.brand}</Text>
                    <Text style={styles.ratingText}>
                        {Number(product.rating || 0).toFixed(1)} / 5 ({product.numReviews || 0} reviews)
                    </Text>
                    
                    {/* Price with Discount */}
                    {(() => {
                        const hasDiscount = product.originalPrice && Number(product.originalPrice) > Number(product.price);
                        const discountPercent = hasDiscount 
                            ? Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)
                            : 0;
                        
                        return (
                            <View style={styles.priceContainer}>
                                {hasDiscount ? (
                                    <>
                                        <Text style={styles.originalPrice}>${(product.originalPrice || 0).toFixed(2)}</Text>
                                        <Text style={styles.priceText}>${(product.price || 0).toFixed(2)}</Text>
                                        <View style={styles.discountBadge}>
                                            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.priceText}>${(product.price || 0).toFixed(2)}</Text>
                                )}
                            </View>
                        );
                    })()}
                    
                    {/* Stock Status */}
                    <View style={styles.stockContainer}>
                        {product.countInStock > 0 ? (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                                <Text style={styles.inStockText}>In Stock ({product.countInStock} available)</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="close-circle" size={18} color="#dc2626" />
                                <Text style={styles.outOfStockText}>Out of Stock</Text>
                            </>
                        )}
                    </View>

                    <Text style={styles.descriptionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{product.description}</Text>
                </View>

                {/* Add to Cart Button - Sticky */}
                {product.countInStock > 0 && (
                    <View style={styles.addToCartSection}>
                        <TouchableOpacity
                            style={[styles.addToCartButton, addingToCart && styles.addToCartButtonDisabled]}
                            onPress={handleAddToCart}
                            disabled={addingToCart}
                        >
                            {addingToCart ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="cart" size={20} color="#fff" />
                                    <Text style={styles.addToCartText}>Add to Cart</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Reviews Section */}
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
        backgroundColor: "#f8f9fa",
    },
    scrollContent: {
        paddingBottom: 160,
    },
    imageCarouselContainer: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    mainImageWrapper: {
        width: width,
        height: 380,
        backgroundColor: "#f3f4f6",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    mainImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    prevButton: {
        position: "absolute",
        left: 16,
        top: "50%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 24,
        padding: 8,
        transform: [{ translateY: -24 }],
        zIndex: 10,
    },
    nextButton: {
        position: "absolute",
        right: 16,
        top: "50%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 24,
        padding: 8,
        transform: [{ translateY: -24 }],
        zIndex: 10,
    },
    imageCounter: {
        position: "absolute",
        bottom: 16,
        right: 16,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        zIndex: 10,
    },
    imageCounterText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    thumbnailContainer: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexGrow: 0,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 2,
        borderColor: "#e5e7eb",
        overflow: "hidden",
        backgroundColor: "#f3f4f6",
    },
    thumbnailActive: {
        borderColor: "#1e40af",
        borderWidth: 3,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#fff",
        marginTop: 8,
    },
    contentHeader: {
        fontWeight: "800",
        fontSize: 24,
        color: "#111",
        marginBottom: 8,
    },
    brandText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e40af",
        marginBottom: 8,
    },
    priceText: {
        fontSize: 28,
        fontWeight: "800",
        color: "#f59e0b",
        marginBottom: 12,
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
        flexWrap: "wrap",
    },
    originalPrice: {
        fontSize: 20,
        fontWeight: "700",
        color: "#999",
        textDecorationLine: "line-through",
    },
    discountBadge: {
        backgroundColor: "#dc2626",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    discountText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    ratingText: {
        color: "#666",
        fontSize: 14,
        marginBottom: 12,
        fontWeight: "600",
    },
    stockContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "#f0fdf4",
        borderRadius: 8,
        marginBottom: 16,
    },
    inStockText: {
        color: "#16a34a",
        fontWeight: "600",
    },
    outOfStockText: {
        color: "#dc2626",
        fontWeight: "600",
    },
    descriptionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111",
        marginTop: 8,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: "#555",
        lineHeight: 22,
    },
    addToCartSection: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    addToCartButton: {
        backgroundColor: "#1e40af",
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        elevation: 3,
    },
    addToCartButtonDisabled: {
        opacity: 0.7,
    },
    addToCartText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    reviewFilterBox: {
        marginHorizontal: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        marginBottom: 12,
    },
    filterTitle: {
        fontWeight: "700",
        fontSize: 18,
        marginBottom: 12,
        color: "#111",
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 8,
    },
    filterChip: {
        backgroundColor: "#f0f4ff",
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#d1d5db",
    },
    starChip: {
        backgroundColor: "#f0f4ff",
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#d1d5db",
    },
    filterChipActive: {
        backgroundColor: "#1e40af",
        borderColor: "#1e40af",
    },
    filterChipText: {
        color: "#555",
        fontWeight: "600",
        fontSize: 13,
    },
    filterChipTextActive: {
        color: "#fff",
    },
    reviewsContainer: {
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 20,
    },
    reviewCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        elevation: 1,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    reviewHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    reviewAuthor: {
        fontWeight: "700",
        color: "#111",
        fontSize: 14,
    },
    reviewDate: {
        color: "#999",
        fontSize: 12,
    },
    reviewStars: {
        color: "#f59e0b",
        fontWeight: "700",
        marginBottom: 8,
    },
    reviewComment: {
        color: "#555",
        marginBottom: 8,
        lineHeight: 18,
    },
    mediaRow: {
        marginTop: 8,
    },
    reviewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: "#f0f0f0",
    },
    emptyReviews: {
        color: "#999",
        textAlign: "center",
        marginVertical: 20,
        fontSize: 14,
    },
    image: {
        width: "100%",
        height: 250,
    },
    availabilityContainer: {
        marginBottom: 20,
        alignItems: "center",
        paddingHorizontal: 14,
    },
});

export default SingleProduct;
