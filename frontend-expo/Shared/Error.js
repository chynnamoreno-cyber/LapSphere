import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { adminTheme } from "../assets/common/adminTheme";

const Error = (props) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>{props.message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "88%",
        alignItems: "center",
        margin: adminTheme.spacing.md,
        padding: adminTheme.spacing.md,
        backgroundColor: adminTheme.colors.error + "20",
        borderRadius: adminTheme.radius.md,
        borderLeftWidth: 4,
        borderLeftColor: adminTheme.colors.error,
    },
    text: {
        color: adminTheme.colors.error,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.sm,
    },
});

export default Error;
