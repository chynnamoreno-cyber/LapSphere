import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Text, View, StyleSheet, Dimensions, TouchableOpacity, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SwipeListView } from "react-native-swipe-list-view";
import { removeFromCart, clearCart, changeCartItemQuantity } from "../../Redux/Actions/cartActions";
import { Surface, Divider, Avatar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

var { height, width } = Dimensions.get("window");
const FALLBACK = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const Cart = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const cartItems = useSelector((s) => s.cartItems);
    const [editingQtyId, setEditingQtyId] = useState(null);
    const [qtyInputs, setQtyInputs] = useState({});
    
    let total = 0;
    cartItems.forEach((c) => (total += Number(c.price || 0) * Number(c.quantity || 1)));

    const renderItem = ({ item }) => {
        const itemId = item.id || item._id;
        const isEditing = editingQtyId === itemId;
        const currentQty = Number(item.quantity || 1);
        const inputValue = qtyInputs[itemId] !== undefined ? qtyInputs[itemId] : String(currentQty);
        const maxQty = Number(item.countInStock || 100);

        const handleQtyChange = (newValue) => {
            const qty = Math.max(1, Math.min(Number(newValue) || 1, maxQty));
            dispatch(changeCartItemQuantity({ itemId, quantity: qty }));
            setEditingQtyId(null);
            setQtyInputs({ ...qtyInputs, [itemId]: "" });
        };

        const handleQtyInputChange = (text) => {
            setQtyInputs({ ...qtyInputs, [itemId]: text });
        };

        return (
            <Surface style={styles.rowCard}>
                <Avatar.Image size={52} source={{ uri: item.image || FALLBACK }} />

                <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.rowMeta}>
                        <Text style={styles.rowPrice}>$ {Number(item.price || 0).toFixed(2)}</Text>
                        <Text style={styles.rowStock}>
                            Stock: {Number(item.countInStock || 0)}
                        </Text>
                    </View>

                    <View style={styles.stepperRow}>
                        <TouchableOpacity
                            style={[styles.stepBtn, item.quantity <= 1 && styles.stepBtnDisabled]}
                            disabled={Number(item.quantity || 1) <= 1}
                            onPress={() =>
                                dispatch(
                                    changeCartItemQuantity({
                                        itemId,
                                        delta: -1,
                                    })
                                )
                            }
                        >
                            <Ionicons name="remove-circle" size={20} color="white" />
                        </TouchableOpacity>

                        {isEditing ? (
                            <TextInput
                                style={styles.qtyInput}
                                keyboardType="number-pad"
                                value={inputValue}
                                onChangeText={handleQtyInputChange}
                                onBlur={() => {
                                    const qty = Math.max(1, Math.min(Number(inputValue) || currentQty, maxQty));
                                    handleQtyChange(qty);
                                }}
                                onSubmitEditing={() => {
                                    const qty = Math.max(1, Math.min(Number(inputValue) || currentQty, maxQty));
                                    handleQtyChange(qty);
                                }}
                                autoFocus
                            />
                        ) : (
                            <TouchableOpacity
                                style={styles.qtyDisplay}
                                onPress={() => {
                                    setEditingQtyId(itemId);
                                    setQtyInputs({ ...qtyInputs, [itemId]: String(currentQty) });
                                }}
                            >
                                <Text style={styles.qtyText}>{currentQty}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.stepBtn,
                                Number(item.countInStock || 0) > 0 &&
                                Number(item.quantity || 1) >= Number(item.countInStock || 0) &&
                                styles.stepBtnDisabled,
                            ]}
                            disabled={
                                Number(item.countInStock || 0) > 0 &&
                                Number(item.quantity || 1) >= Number(item.countInStock || 0)
                            }
                            onPress={() =>
                                dispatch(
                                    changeCartItemQuantity({
                                        itemId,
                                        delta: +1,
                                    })
                                )
                            }
                        >
                            <Ionicons name="add-circle" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.deleteInlineBtn} onPress={() => dispatch(removeFromCart(item))}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
            </Surface>
        );
    };

    const renderHiddenItem = (rowData) => (
        <TouchableOpacity onPress={() => dispatch(removeFromCart(rowData.item))}>
            <Surface style={styles.hiddenButton}>
                <Ionicons name="trash" color="white" size={30} />
                <Text style={{ color: "white" }}>Delete</Text>
            </Surface>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1 }}>
            {cartItems.length > 0 ? (
                <Surface style={{ flex: 1, backgroundColor: "white", paddingBottom: 70 }}>
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
                <Surface style={[styles.emptyContainer, { paddingBottom: 70 }]}>
                    <Text>No items in cart</Text>
                </Surface>
            )}
            <View style={styles.bottomContainer}>
                <Text style={styles.price}>$ {total.toFixed(2)}</Text>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[styles.button, styles.buttonClear]}
                        onPress={() => dispatch(clearCart())}
                    >
                        <Ionicons name="trash" size={18} color="white" />
                        <Text style={styles.buttonText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.buttonCheckout]}
                        onPress={() => navigation.navigate("Checkout")}
                    >
                        <Ionicons name="arrow-forward" size={18} color="white" />
                        <Text style={styles.buttonText}>Checkout</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    emptyContainer: { height, alignItems: "center", justifyContent: "center" },
    bottomContainer: {
        flexDirection: "row",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        elevation: 20,
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
    },
    price: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e40af",
        minWidth: 90,
    },
    buttonGroup: {
        flexDirection: "row",
        gap: 8,
        flex: 1,
        marginLeft: 12,
    },
    button: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    buttonClear: {
        backgroundColor: "#ef4444",
    },
    buttonCheckout: {
        backgroundColor: "#10b981",
    },
    buttonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },
    hiddenButton: { backgroundColor: "transparent", justifyContent: "center", alignItems: "flex-end", paddingRight: 25, height: 70, width: width / 1.2 },
    rowCard: {
        padding: 10,
        margin: 6,
        marginLeft: 0,
        marginRight: 0,
        backgroundColor: "white",
        borderRadius: 0,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    rowInfo: {
        flex: 1,
        marginLeft: 10,
        marginRight: 8,
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    rowMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    rowPrice: {
        fontSize: 14,
        fontWeight: "800",
        color: "#1d4ed8",
    },
    rowStock: {
        fontSize: 11,
        fontWeight: "700",
        color: "#6b7280",
    },
    stepperRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 10,
    },
    stepBtn: {
        width: 34,
        height: 34,
        backgroundColor: "#1e40af",
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    stepBtnDisabled: {
        backgroundColor: "#93c5fd",
    },
    qtyText: {
        minWidth: 30,
        textAlign: "center",
        fontSize: 16,
        fontWeight: "800",
        color: "#111827",
    },
    qtyDisplay: {
        minWidth: 40,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: "#f0f0f0",
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ddd",
    },
    qtyInput: {
        minWidth: 40,
        width: 50,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: "#fff",
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#1e40af",
        textAlign: "center",
        fontSize: 16,
        fontWeight: "800",
        color: "#111827",
    },
    deleteInlineBtn: {
        width: 40,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default Cart;
