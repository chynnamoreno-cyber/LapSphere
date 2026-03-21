import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from "react-native";
import { Surface, RadioButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

const methods = [
    { name: "Cash on Delivery", value: 1, icon: "💵" },
    { name: "Bank Transfer", value: 2, icon: "🏦" },
    { name: "Card Payment", value: 3, icon: "💳" },
];
const paymentCards = [
    { name: "Wallet", value: 1 },
    { name: "Visa", value: 2 },
    { name: "MasterCard", value: 3 },
    { name: "Other", value: 4 },
];

const Payment = ({ route }) => {
    const order = route.params?.order;
    // react-native-paper RadioButton.Group uses string values; avoid RadioButton onPress (warns).
    const [selected, setSelected] = useState("");
    const [card, setCard] = useState("");
    const navigation = useNavigation();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Select Payment Method</Text>
                <Text style={styles.subtitle}>Choose how you'd like to pay for your order</Text>
            </View>

            <Surface style={styles.card}>
                <Text style={styles.cardTitle}>Payment Options</Text>
                <View style={styles.divider} />
                <RadioButton.Group
                    value={selected}
                    onValueChange={(v) => setSelected(String(v))}
                >
                    {methods.map((item, i) => {
                        const valueStr = String(item.value);
                        return (
                            <TouchableOpacity
                                key={i}
                                onPress={() => setSelected(valueStr)}
                                style={styles.methodRow}
                                activeOpacity={0.85}
                            >
                                <View style={styles.methodLeft}>
                                    <Text style={styles.methodIcon}>{item.icon}</Text>
                                    <Text style={styles.methodName}>{item.name}</Text>
                                </View>
                                <RadioButton value={valueStr} color="#1e40af" />
                            </TouchableOpacity>
                        );
                    })}
                </RadioButton.Group>
            </Surface>

            {selected === "3" && (
                <Surface style={styles.card}>
                    <Text style={styles.cardTitle}>Select Card Type</Text>
                    <View style={styles.divider} />
                    <Picker
                        style={styles.picker}
                        selectedValue={card}
                        onValueChange={setCard}
                    >
                        <Picker.Item label="Choose a card..." value="" />
                        {paymentCards.map((c) => (
                            <Picker.Item key={c.name} label={c.name} value={c.name} />
                        ))}
                    </Picker>
                </Surface>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.buttonPrimary}
                    onPress={() => {
                        if (!selected) {
                            alert("Please select a payment method");
                            return;
                        }
                        navigation.navigate("Confirm", { order });
                    }}
                >
                    <Text style={styles.buttonText}>Continue to Confirmation</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.spacing} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginBottom: 16,
    },
    methodRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderRadius: 10,
        backgroundColor: "#f9f9f9",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    methodLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    methodIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    methodName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1a1a1a",
    },
    picker: {
        height: 50,
        width: "100%",
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    buttonContainer: {
        marginTop: 24,
        marginBottom: 16,
    },
    buttonPrimary: {
        backgroundColor: "#1e40af",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 16,
    },
    spacing: {
        height: 20,
    },
});

export default Payment;
