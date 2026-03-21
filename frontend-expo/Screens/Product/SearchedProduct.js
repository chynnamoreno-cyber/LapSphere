import React from "react";
import { View, StyleSheet, Dimensions, FlatList, TouchableOpacity } from "react-native";
import { Surface, Text, Avatar } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

var { width } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const itemWidth = (width - 32) / 2;

const SearchedProduct = ({ productsFiltered }) => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            {productsFiltered.length > 0 ? (
                <FlatList
                    data={productsFiltered}
                    keyExtractor={(item) => item._id || item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.itemWrapper}
                            onPress={() =>
                                navigation.navigate("Product Detail", { item })
                            }
                        >
                            <Surface style={styles.card}>
                                <Avatar.Image
                                    size={100}
                                    source={{
                                        uri: item.image || FALLBACK_IMAGE,
                                    }}
                                />
                                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                                <Text style={styles.description} numberOfLines={2}>{item.description || "No description"}</Text>
                                <Text style={styles.price}>${Number(item.price || 0).toFixed(2)}</Text>
                                <Text style={styles.stock}>Stock: {item.countInStock || 0}</Text>
                            </Surface>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <View style={styles.center}>
                    <Text style={styles.noResults}>
                        No products match the selected criteria
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 8,
    },
    row: {
        justifyContent: "space-between",
        marginBottom: 8,
    },
    itemWrapper: {
        width: itemWidth,
    },
    card: {
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    name: {
        fontSize: 13,
        fontWeight: "700",
        marginTop: 8,
        textAlign: "center",
        color: "#1a1a1a",
    },
    description: {
        fontSize: 11,
        color: "#666",
        marginTop: 4,
        textAlign: "center",
    },
    price: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1e40af",
        marginTop: 8,
    },
    stock: {
        fontSize: 11,
        color: "#10b981",
        marginTop: 4,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    noResults: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
});

export default SearchedProduct;
