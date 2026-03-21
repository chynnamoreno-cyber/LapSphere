import React, { useState, useCallback } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
} from "react-native";
import { Searchbar } from "react-native-paper";
import Slider from "@react-native-community/slider";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import ProductList from "./ProductList";
import SearchedProduct from "./SearchedProduct";
import Banner from "../../Shared/Banner";
import CategoryFilter from "./CategoryFilter";
import CartIcon from "../../Shared/CartIcon";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { useFocusEffect } from "@react-navigation/native";
import { fetchProducts } from "../../Redux/Actions/productActions";

var { height, width } = Dimensions.get("window");

const ProductContainer = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const productsFromStore = useSelector((state) => state.products?.list || []);
    const [productsFiltered, setProductsFiltered] = useState([]);
    const [focus, setFocus] = useState(false);
    const [categories, setCategories] = useState([]);
    const [active, setActive] = useState(-1);
    const [initialState, setInitialState] = useState([]);
    const [productsCtg, setProductsCtg] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [priceFloor, setPriceFloor] = useState(0);
    const [priceCeil, setPriceCeil] = useState(1000);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(1000);

    const applyFilters = (sourceProducts, overrides = {}) => {
        const products = Array.isArray(sourceProducts) ? sourceProducts : [];
        const nextKeyword = overrides.keyword !== undefined ? overrides.keyword : keyword;
        const nextCategory = overrides.category !== undefined ? overrides.category : selectedCategory;
        const nextMinPrice = overrides.minPrice !== undefined ? overrides.minPrice : minPrice;
        const nextMaxPrice = overrides.maxPrice !== undefined ? overrides.maxPrice : maxPrice;

        const filtered = products.filter((product) => {
            const productName = String(product?.name || "").toLowerCase();
            const productBrand = String(product?.brand || "").toLowerCase();
            const productDescription = String(product?.description || "").toLowerCase();
            const searchKeyword = String(nextKeyword).toLowerCase();
            const matchesSearch = !nextKeyword || 
                productName.includes(searchKeyword) || 
                productBrand.includes(searchKeyword) || 
                productDescription.includes(searchKeyword);

            const categoryId = product?.category?.id || product?.category?._id || product?.category;
            const matchesCategory = nextCategory === "all" || String(categoryId) === String(nextCategory);

            const price = Number(product?.price || 0);
            const matchesPrice = price >= Number(nextMinPrice || 0) && price <= Number(nextMaxPrice || 0);

            return matchesSearch && matchesCategory && matchesPrice;
        });

        setProductsFiltered(filtered);
        setProductsCtg(filtered);
    };

    const onBlur = () => setFocus(false);

    const changeCtg = (ctg) => {
        const category = ctg || "all";
        setSelectedCategory(category);
        applyFilters(initialState, { category });
    };

    const onChangeSearch = async (text) => {
        setKeyword(text);

        if (!text || text.trim() === "") {
            // No search query - use all products
            applyFilters(initialState, { keyword: text });
            return;
        }

        try {
            // Call backend search API
            const response = await axios.get(`${baseURL}products/search/query`, {
                params: { q: text.trim() }
            });
            const searchResults = Array.isArray(response.data) ? response.data : [];
            
            // Apply filters (category and price) to search results
            applyFilters(searchResults, { keyword: "" }); // Clear keyword to avoid double filtering
        } catch (error) {
            console.log("Search API error:", error.message);
            // Fallback to local filtering
            applyFilters(initialState, { keyword: text });
        }
    };

    const onChangeMinPrice = (value) => {
        const rounded = Math.floor(value);
        const nextMin = Math.min(rounded, maxPrice);
        setMinPrice(nextMin);
        applyFilters(initialState, { minPrice: nextMin });
    };

    const onChangeMaxPrice = (value) => {
        const rounded = Math.floor(value);
        const nextMax = Math.max(rounded, minPrice);
        setMaxPrice(nextMax);
        applyFilters(initialState, { maxPrice: nextMax });
    };

    const resetFilters = () => {
        setActive(-1);
        setSelectedCategory("all");
        setKeyword("");
        setMinPrice(priceFloor);
        setMaxPrice(priceCeil);
        applyFilters(initialState, {
            category: "all",
            keyword: "",
            minPrice: priceFloor,
            maxPrice: priceCeil,
        });
    };

    useFocusEffect(
        useCallback(() => {
            setFocus(false);
            setActive(-1);
            dispatch(fetchProducts());

            axios
                .get(`${baseURL}categories`)
                .then((res) => setCategories(res.data))
                .catch((error) => console.log("Api categories call error"));

            return () => {
                setProductsFiltered([]);
                setCategories([]);
                setInitialState([]);
            };
        }, [dispatch])
    );

    useFocusEffect(
        useCallback(() => {
            const fetched = Array.isArray(productsFromStore) ? productsFromStore : [];
            const prices = fetched.map((item) => Number(item?.price || 0));
            const min = prices.length ? Math.floor(Math.min(...prices)) : 0;
            const max = prices.length ? Math.ceil(Math.max(...prices)) : 1000;

            setInitialState(fetched);
            setPriceFloor(min);
            setPriceCeil(max);
            setMinPrice(min);
            setMaxPrice(max);
            setSelectedCategory("all");
            setKeyword("");
            setProductsFiltered(fetched);
            setProductsCtg(fetched);
        }, [productsFromStore])
    );

    const renderFilterPanel = () => (
        <View style={styles.filterPanel}>
            <View style={styles.filterHeaderRow}>
                <Text style={styles.filterTitle}>Price Range</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                    <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.priceText}>Min: ${Number(minPrice).toFixed(0)}</Text>
            <Slider
                minimumValue={priceFloor}
                maximumValue={priceCeil}
                value={minPrice}
                onValueChange={onChangeMinPrice}
                step={1}
                minimumTrackTintColor="#111"
                maximumTrackTintColor="#bbb"
            />
            <Text style={styles.priceText}>Max: ${Number(maxPrice).toFixed(0)}</Text>
            <Slider
                minimumValue={priceFloor}
                maximumValue={priceCeil}
                value={maxPrice}
                onValueChange={onChangeMaxPrice}
                step={1}
                minimumTrackTintColor="#111"
                maximumTrackTintColor="#bbb"
            />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header: menu (opens drawer), LapSphere, cart */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                    style={styles.menuBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="menu" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>LapSphere</Text>
                <TouchableOpacity
                    onPress={() => navigation.getParent()?.navigate("Cart Screen")}
                    style={styles.cartBtn}
                >
                    <Ionicons name="bag-handle" size={28} color="#fff" />
                    <CartIcon />
                </TouchableOpacity>
            </View>

            {focus ? (
                <View style={styles.searchContainer}>
                    <View style={styles.searchRow}>
                        <Searchbar
                            placeholder="Search products..."
                            onChangeText={(text) => {
                                onChangeSearch(text);
                            }}
                            value={keyword}
                            onClearIconPress={onBlur}
                            style={styles.searchbar}
                            iconColor="#1e40af"
                        />
                    </View>
                    <View style={styles.brandsSection}>
                        <CategoryFilter
                            categories={categories}
                            categoryFilter={changeCtg}
                            productsCtg={productsCtg}
                            active={active}
                            setActive={setActive}
                        />
                    </View>
                    {renderFilterPanel()}
                    <SearchedProduct productsFiltered={productsFiltered} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Banner />
                    <View style={styles.brandsSection}>
                        <Text style={styles.sectionTitle}>Categories</Text>
                        <CategoryFilter
                            categories={categories}
                            categoryFilter={changeCtg}
                            productsCtg={productsCtg}
                            active={active}
                            setActive={setActive}
                        />
                    </View>
                    {renderFilterPanel()}
                    {/* Search bar */}
                    <View style={styles.searchRow}>
                        <Searchbar
                            placeholder="Search products..."
                            onChangeText={(text) => {
                                onChangeSearch(text);
                                setFocus(true);
                            }}
                            value={keyword}
                            onClearIconPress={onBlur}
                            style={styles.searchbar}
                            iconColor="#1e40af"
                        />
                    </View>
                    
                    {productsCtg.length > 0 ? (
                        <>
                            <Text style={styles.productsTitle}>Products ({productsCtg.length})</Text>
                            <View style={styles.listContainer}>
                                {productsCtg.map((item) => (
                                    <ProductList key={item.id || item._id} item={item} />
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={[styles.center, { height: height / 3 }]}>
                            <Ionicons name="search-outline" size={48} color="#d1d5db" />
                            <Text style={styles.noProductsText}>No products found</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "#f8f9fa" 
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: "#1e40af",
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    menuBtn: { 
        padding: 8 
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 0.5,
    },
    cartBtn: { 
        padding: 8, 
        position: "relative" 
    },
    scrollContent: { 
        paddingBottom: 24 
    },
    brandsSection: { 
        backgroundColor: "#fff",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111",
        marginLeft: 16,
        marginBottom: 8,
    },
    searchContainer: { 
        flex: 1 
    },
    searchRow: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    searchbar: { 
        backgroundColor: "#f3f4f6",
        elevation: 0,
        borderRadius: 12,
    },
    filterPanel: {
        marginHorizontal: 12,
        marginTop: 12,
        marginBottom: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        elevation: 2,
    },
    filterHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    filterTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#111",
    },
    resetBtn: {
        backgroundColor: "#1e40af",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    resetBtnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    priceText: {
        color: "#555",
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 8,
    },
    productsTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111",
        marginLeft: 12,
        marginTop: 12,
        marginBottom: 8,
    },
    listContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 6,
        paddingBottom: 12,
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        gap: 12,
    },
    noProductsText: {
        fontSize: 16,
        color: "#999",
        fontWeight: "500",
    },
});

export default ProductContainer;
