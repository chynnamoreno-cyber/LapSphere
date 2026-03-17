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
            const matchesSearch = !nextKeyword || productName.includes(String(nextKeyword).toLowerCase());

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

    const onChangeSearch = (text) => {
        setKeyword(text);
        applyFilters(initialState, { keyword: text });
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
            {/* Header: menu (opens drawer), SnapShop, cart */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                    style={styles.menuBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="grid-outline" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SnapShop</Text>
                <TouchableOpacity
                    onPress={() => navigation.getParent()?.navigate("Cart Screen")}
                    style={styles.cartBtn}
                >
                    <Ionicons name="bag-outline" size={24} color="#000" />
                    <CartIcon />
                </TouchableOpacity>
            </View>

            {focus ? (
                <View style={styles.searchContainer}>
                    <View style={styles.searchRow}>
                        <Searchbar
                            placeholder="Search"
                            onChangeText={(text) => {
                                onChangeSearch(text);
                            }}
                            value={keyword}
                            onClearIconPress={onBlur}
                            style={styles.searchbar}
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
                        <CategoryFilter
                            categories={categories}
                            categoryFilter={changeCtg}
                            productsCtg={productsCtg}
                            active={active}
                            setActive={setActive}
                        />
                    </View>
                    {/* Search bar: full width, own row above products */}
                    <View style={styles.searchRow}>
                        <Searchbar
                            placeholder="Search"
                            onChangeText={(text) => {
                                onChangeSearch(text);
                                setFocus(true);
                            }}
                            value={keyword}
                            onClearIconPress={onBlur}
                            style={styles.searchbar}
                        />
                    </View>
                    {renderFilterPanel()}
                    {productsCtg.length > 0 ? (
                        <View style={styles.listContainer}>
                            {productsCtg.map((item) => (
                                <ProductList key={item.id || item._id} item={item} />
                            ))}
                        </View>
                    ) : (
                        <View style={[styles.center, { height: height / 3 }]}>
                            <Text>No products found</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    menuBtn: { padding: 4 },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#000",
    },
    cartBtn: { padding: 4, position: "relative" },
    scrollContent: { paddingBottom: 24 },
    brandsSection: { backgroundColor: "#f2f2f2", paddingVertical: 8 },
    searchContainer: { flex: 1 },
    searchRow: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#fff",
    },
    searchbar: { backgroundColor: "#f5f5f5", elevation: 0 },
    filterPanel: {
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 4,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
    },
    filterHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    filterTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111",
    },
    resetBtn: {
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    resetBtnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    priceText: {
        color: "#333",
        fontWeight: "600",
        marginTop: 4,
    },
    listContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 8,
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    },
});

export default ProductContainer;
