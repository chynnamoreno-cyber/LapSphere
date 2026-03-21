import React from "react";
import { TouchableOpacity, View, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ProductCard from "./ProductCard";

var { width } = Dimensions.get("window");

const ProductList = (props) => {
    const { item } = props;
    const navigation = useNavigation();

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Product Detail", { item })}
            style={styles.container}
        >
            <ProductCard {...item} />
        </TouchableOpacity>
    );
};

const styles = {
    container: {
        width: "50%",
        paddingHorizontal: 6,
        paddingVertical: 6,
    },
};

export default ProductList;
