import React from "react";
import { ScrollView, Dimensions, StyleSheet, Text } from "react-native";

var { width } = Dimensions.get("window");

const FormContainer = ({ children, title }) => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {children}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        marginBottom: 60,
        width: width,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        paddingVertical: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 24,
    },
});

export default FormContainer;
