import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    RefreshControl,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import ListItem from "./ListItem";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import { getJwtToken } from "../../assets/common/authToken";
import { adminTheme } from "../../assets/common/adminTheme";

var { height, width } = Dimensions.get("window");

const Products = () => {
    const [productList, setProductList] = useState([]);
    const [productFilter, setProductFilter] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const navigation = useNavigation();

    const ListHeader = () => (
        <View style={styles.listHeader}>
            <Text style={styles.headerText}>Tap to view • Long-press for actions</Text>
        </View>
    );

    const searchProduct = (text) => {
        if (text === "") {
            setProductFilter(productList);
            return;
        }
        setProductFilter(
            productList.filter((i) =>
                i.name.toLowerCase().includes(text.toLowerCase())
            )
        );
    };

    const deleteProduct = (id) => {
        const product = productList.find(p => (p.id || p._id) === id);
        const productName = product?.name || "this product";
        
        Alert.alert(
            "Delete Product",
            `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    onPress: async () => {
                        if (deletingId) return;
                        setDeletingId(id);
                        try {
                            // Get fresh token directly instead of relying on state
                            const jwt = await getJwtToken();
                            if (!jwt) {
                                Alert.alert("Error", "Session expired. Please login again.");
                                setDeletingId(null);
                                return;
                            }
                            
                            await axios.delete(`${baseURL}products/${id}`, {
                                headers: { Authorization: `Bearer ${jwt}` },
                            });
                            
                            const filter = (items) => items.filter((item) => (item.id || item._id) !== id);
                            setProductList((prev) => filter(prev));
                            setProductFilter((prev) => filter(prev));
                        } catch (error) {
                            Alert.alert("Error", error?.response?.data?.message || "Failed to delete product");
                            console.log(error);
                        } finally {
                            setDeletingId(null);
                        }
                    },
                    style: "destructive",
                },
            ]
        );
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        axios.get(`${baseURL}products`).then((res) => {
            setProductList(res.data);
            setProductFilter(res.data);
            setRefreshing(false);
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            getJwtToken()
                .then((res) => setToken(res || ""))
                .catch((error) => console.log(error));
            axios
                .get(`${baseURL}products`)
                .then((res) => {
                    setProductList(res.data);
                    setProductFilter(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));

            return () => {
                setProductList([]);
                setProductFilter([]);
                setLoading(true);
            };
        }, [])
    );

    return (
        <View style={styles.container}>
            <View style={styles.buttonContainer}>
                <EasyButton
                    primary
                    medium
                    onPress={() => navigation.navigate("Orders")}
                >
                    <Ionicons name="bag-outline" size={18} color={adminTheme.colors.text} />
                    <Text style={styles.buttonText}>Orders</Text>
                </EasyButton>
                <EasyButton
                    primary
                    medium
                    onPress={() => navigation.navigate("ProductForm")}
                >
                    <Ionicons name="add-outline" size={18} color={adminTheme.colors.text} />
                    <Text style={styles.buttonText}>Add</Text>
                </EasyButton>
                <EasyButton
                    primary
                    medium
                    onPress={() => navigation.navigate("Stock Alerts")}
                >
                    <Ionicons name="warning-outline" size={18} color={adminTheme.colors.text} />
                    <Text style={styles.buttonText}>Stock</Text>
                </EasyButton>
                <EasyButton
                    primary
                    medium
                    onPress={() => navigation.navigate("Promo Broadcast")}
                >
                    <Ionicons name="megaphone-outline" size={18} color={adminTheme.colors.text} />
                    <Text style={styles.buttonText}>Promo</Text>
                </EasyButton>
                <EasyButton
                    primary
                    medium
                    onPress={() => navigation.navigate("Categories")}
                >
                    <Ionicons name="list-outline" size={18} color={adminTheme.colors.text} />
                    <Text style={styles.buttonText}>Cat.</Text>
                </EasyButton>
            </View>
            <Searchbar
                placeholder="Search products..."
                placeholderTextColor={adminTheme.colors.textTertiary}
                onChangeText={(text) => searchProduct(text)}
                style={styles.searchbar}
                inputStyle={styles.searchInput}
            />
            {loading ? (
                <View style={styles.spinner}>
                    <ActivityIndicator size="large" color={adminTheme.colors.primaryLight} />
                </View>
            ) : (
                <FlatList
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor={adminTheme.colors.primaryLight}
                        />
                    }
                    ListHeaderComponent={ListHeader}
                    data={productFilter}
                    renderItem={({ item, index }) => (
                        <ListItem
                            item={item}
                            index={index}
                            deleteProduct={deleteProduct}
                            isDeleting={deletingId === (item.id || item._id)}
                        />
                    )}
                    keyExtractor={(item) => String(item.id || item._id)}
                    style={styles.flatlist}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: adminTheme.colors.background,
    },
    listHeader: {
        padding: adminTheme.spacing.md,
        backgroundColor: adminTheme.colors.surface,
        borderBottomWidth: 2,
        borderBottomColor: adminTheme.colors.border,
    },
    headerText: {
        fontWeight: "700",
        color: adminTheme.colors.primaryLight,
        fontSize: adminTheme.typography.fontSize.xs,
    },
    spinner: {
        height: height / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonContainer: {
        margin: adminTheme.spacing.lg,
        alignSelf: "center",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: adminTheme.spacing.md,
    },
    buttonText: {
        marginLeft: adminTheme.spacing.sm,
        color: adminTheme.colors.text,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.sm,
    },
    searchbar: {
        backgroundColor: adminTheme.colors.surface,
        borderRadius: adminTheme.radius.md,
        marginHorizontal: adminTheme.spacing.md,
        marginVertical: adminTheme.spacing.md,
        elevation: 2,
    },
    searchInput: {
        color: adminTheme.colors.text,
    },
    flatlist: {
        backgroundColor: adminTheme.colors.background,
    },
});

export default Products;
