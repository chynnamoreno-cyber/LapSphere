import React from "react";
import {
    StyleSheet,
    View,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addToCart } from "../../Redux/Actions/cartActions";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";

var { width } = Dimensions.get("window");

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const ProductCard = (props) => {
    const { name, price, originalPrice, image, countInStock, rating, numReviews } = props;
    const dispatch = useDispatch();
    const [adding, setAdding] = React.useState(false);

    // Calculate discount percentage if originalPrice exists
    const hasDiscount = originalPrice && Number(originalPrice) > Number(price);
    const discountPercent = hasDiscount 
        ? Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)
        : 0;

    const handleAddToCart = () => {
        if (adding) return;
        setAdding(true);
        setTimeout(() => {
            dispatch(addToCart({ ...props, quantity: 1 }));
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: `${name} added to Cart`,
                text2: "Go to your cart to complete order",
            });
            setAdding(false);
        }, 300);
    };

    return (
        <View style={styles.container}>
            {/* Image Container */}
            <View style={styles.imageContainer}>
                <Image
                    style={styles.image}
                    resizeMode="contain"
                    source={{ uri: image || FALLBACK_IMAGE }}
                    onError={() => {
                        // Fallback if image fails to load
                    }}
                />
                {!countInStock && <View style={styles.outOfStockOverlay} />}
            </View>

            {/* Content Container */}
            <View style={styles.contentContainer}>
                <Text style={styles.title} numberOfLines={2}>
                    {name}
                </Text>

                {/* Rating */}
                <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={styles.ratingText}>{Number(rating || 0).toFixed(1)}</Text>
                    {numReviews > 0 && <Text style={styles.reviewsText}>({numReviews})</Text>}
                </View>

                {/* Price with Discount */}
                <View style={styles.priceContainer}>
                    {hasDiscount ? (
                        <>
                            <Text style={styles.originalPrice}>${(originalPrice || 0).toFixed(2)}</Text>
                            <Text style={styles.price}>${(price || 0).toFixed(2)}</Text>
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                            </View>
                        </>
                    ) : (
                        <Text style={styles.price}>${(price || 0).toFixed(2)}</Text>
                    )}
                </View>

                {/* Stock Status */}
                <View style={styles.stockStatus}>
                    {countInStock > 0 ? (
                        <>
                            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                            <Text style={styles.inStockText}>In Stock</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="close-circle" size={14} color="#dc2626" />
                            <Text style={styles.outOfStockText}>Out of Stock</Text>
                        </>
                    )}
                </View>

                {/* Add to Cart Button */}
                {countInStock > 0 ? (
                    <TouchableOpacity
                        style={[styles.addButton, adding && styles.addButtonDisabled]}
                        onPress={handleAddToCart}
                        disabled={adding}
                    >
                        {adding ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="add-circle" size={16} color="#fff" />
                                <Text style={styles.addButtonText}>Add</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.unavailableButton}>
                        <Text style={styles.unavailableText}>Unavailable</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: width / 2 - 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        marginHorizontal: 6,
        marginVertical: 8,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    imageContainer: {
        width: "100%",
        height: width / 2.2,
        backgroundColor: "#f3f4f6",
        justifyContent: "center",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    outOfStockOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    contentContainer: {
        padding: 10,
        gap: 6,
    },
    title: {
        fontWeight: "700",
        fontSize: 13,
        color: "#111",
        lineHeight: 16,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#f59e0b",
    },
    reviewsText: {
        fontSize: 11,
        color: "#999",
    },
    price: {
        fontSize: 18,
        color: "#f59e0b",
        fontWeight: "800",
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginVertical: 4,
        flexWrap: "wrap",
    },
    originalPrice: {
        fontSize: 14,
        color: "#999",
        textDecorationLine: "line-through",
        fontWeight: "600",
    },
    discountBadge: {
        backgroundColor: "#ef4444",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    discountText: {
        fontSize: 10,
        color: "#fff",
        fontWeight: "700",
    },
    stockStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
    },
    inStockText: {
        fontSize: 11,
        color: "#16a34a",
        fontWeight: "600",
    },
    outOfStockText: {
        fontSize: 11,
        color: "#dc2626",
        fontWeight: "600",
    },
    addButton: {
        backgroundColor: "#1e40af",
        borderRadius: 8,
        paddingVertical: 8,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    addButtonDisabled: {
        opacity: 0.7,
    },
    addButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
    },
    unavailableButton: {
        backgroundColor: "#f3f4f6",
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: "center",
        marginTop: 4,
    },
    unavailableText: {
        color: "#999",
        fontWeight: "600",
        fontSize: 12,
    },
});

export default ProductCard;
