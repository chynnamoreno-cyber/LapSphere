import React from "react";
import { ScrollView, Dimensions, StyleSheet, Text } from "react-native";
import { adminTheme } from "../assets/common/adminTheme";

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
        minHeight: "100%",
        width: width,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: adminTheme.colors.background,
        paddingVertical: adminTheme.spacing.xl,
        paddingBottom: 100,
    },
    title: {
        fontSize: adminTheme.typography.fontSize.xxl,
        fontWeight: "700",
        color: adminTheme.colors.text,
        marginBottom: adminTheme.spacing.xl,
        marginTop: adminTheme.spacing.xl,
    },
});

export default FormContainer;
