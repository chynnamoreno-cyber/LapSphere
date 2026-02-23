import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Text, View, TouchableHighlight, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SwipeListView } from "react-native-swipe-list-view";
import { removeFromCart, clearCart } from "../../Redux/Actions/cartActions";
import { Surface, Divider, Avatar, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

var { height, width } = Dimensions.get("window");
const FALLBACK = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const Cart = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const cartItems = useSelector((s) => s.cartItems);
    let total = 0;
    cartItems.forEach((c) => (total += c.price));

    const renderItem = ({ item }) => (
        <TouchableHighlight>
            <Surface style={{ padding: 8, margin: 4, backgroundColor: "white" }}>
                <Avatar.Image size={48} source={{ uri: item.image || FALLBACK }} />
                <Text>{item.name}</Text>
                <Divider />
                <Text style={{ alignSelf: "flex-start" }}>$ {item.price}</Text>
            </Surface>
        </TouchableHighlight>
    );

    const renderHiddenItem = (rowData) => (
        <TouchableOpacity onPress={() => dispatch(removeFromCart(rowData.item))}>
            <Surface style={styles.hiddenButton}>
                <Ionicons name="trash" color="white" size={30} />
                <Text style={{ color: "white" }}>Delete</Text>
            </Surface>
        </TouchableOpacity>
    );

    return (
        <>
            {cartItems.length > 0 ? (
                <Surface style={{ flex: 1, backgroundColor: "white" }}>
                    <SwipeListView
                        data={cartItems}
                        renderItem={renderItem}
                        renderHiddenItem={renderHiddenItem}
                        disableRightSwipe
                        leftOpenValue={75}
                        rightOpenValue={-200}
                        keyExtractor={(item, i) => String(item.id || item._id || i)}
                    />
                </Surface>
            ) : (
                <Surface style={styles.emptyContainer}>
                    <Text>No items in cart</Text>
                </Surface>
            )}
            <View style={styles.bottomContainer}>
                <Text style={styles.price}>$ {total.toFixed(2)}</Text>
                <Button mode="contained" onPress={() => dispatch(clearCart())} style={{ backgroundColor: "red" }}>Clear</Button>
                <Button mode="contained" onPress={() => navigation.navigate("Checkout")} style={{ backgroundColor: "green" }}>Check Out</Button>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    emptyContainer: { height, alignItems: "center", justifyContent: "center" },
    bottomContainer: { flexDirection: "row", position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", elevation: 20, justifyContent: "space-between", padding: 10 },
    price: { fontSize: 18, color: "red" },
    hiddenButton: { backgroundColor: "red", justifyContent: "center", alignItems: "flex-end", paddingRight: 25, height: 70, width: width / 1.2 },
});

export default Cart;
