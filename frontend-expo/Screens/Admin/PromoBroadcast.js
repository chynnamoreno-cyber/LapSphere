import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import axios from "axios";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";

const PromoBroadcast = () => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const sendPromo = async () => {
        const cleanTitle = String(title || "").trim();
        const cleanMessage = String(message || "").trim();

        if (!cleanTitle || !cleanMessage) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Title and message are required",
            });
            return;
        }

        try {
            setIsSending(true);
            const jwt = (await getJwtToken()) || "";
            const response = await axios.post(
                `${baseURL}promos/broadcast`,
                {
                    title: cleanTitle,
                    message: cleanMessage,
                },
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const sent = Number(response?.data?.sent || 0);
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: "Promo broadcast sent",
                text2: `Recipients reached: ${sent}`,
            });
            setTitle("");
            setMessage("");
        } catch (error) {
            const apiMessage = error?.response?.data?.message || "Failed to send promo broadcast";
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: apiMessage,
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Promo Broadcast</Text>
            <Text style={styles.subheading}>
                Send a promo push notification to all customer devices with saved push tokens.
            </Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
                style={styles.input}
                placeholder="Example: Weekend Sports Sale"
                value={title}
                onChangeText={setTitle}
                maxLength={80}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Example: All ball category items are up to 20% off today"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={240}
            />

            <TouchableOpacity
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                onPress={sendPromo}
                disabled={isSending}
            >
                {isSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Send Broadcast</Text>}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f5f5f5",
    },
    heading: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111",
        marginBottom: 8,
    },
    subheading: {
        fontSize: 13,
        color: "#555",
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#222",
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        color: "#111",
    },
    textArea: {
        minHeight: 100,
    },
    sendButton: {
        marginTop: 6,
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonDisabled: {
        opacity: 0.75,
    },
    sendButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
});

export default PromoBroadcast;
