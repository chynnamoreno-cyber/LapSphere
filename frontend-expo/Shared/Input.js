import React, { useState } from "react";
import { TextInput, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../assets/common/adminTheme";

/**
 * Shared Input component with optional label.
 * Pass `label` for a visible label above the field.
 * Pass `showToggle` along with `secureTextEntry` for password visibility toggle.
 */
const Input = (props) => {
    const [hidden, setHidden] = useState(true);
    const isPassword = props.secureTextEntry && props.showToggle;
    const { showToggle, label, ...rest } = props;

    return (
        <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View style={styles.inputRow}>
                <TextInput
                    style={[
                        styles.input,
                        isPassword && styles.inputWithToggle,
                        props.editable === false && styles.inputDisabled,
                    ]}
                    placeholderTextColor={adminTheme.colors.textTertiary}
                    {...rest}
                    secureTextEntry={isPassword ? hidden : props.secureTextEntry}
                />
                {isPassword ? (
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setHidden((prev) => !prev)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={hidden ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color={adminTheme.colors.textSecondary}
                        />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginBottom: adminTheme.spacing.lg,
    },
    label: {
        fontSize: adminTheme.typography.fontSize.sm,
        fontWeight: "600",
        color: adminTheme.colors.primaryLight,
        marginBottom: adminTheme.spacing.sm,
        marginLeft: adminTheme.spacing.sm,
    },
    inputRow: {
        position: "relative",
    },
    input: {
        width: "100%",
        height: 48,
        backgroundColor: adminTheme.colors.surface,
        borderRadius: adminTheme.radius.md,
        paddingHorizontal: adminTheme.spacing.md,
        paddingRight: adminTheme.spacing.md,
        borderWidth: 1.5,
        borderColor: adminTheme.colors.border,
        fontSize: adminTheme.typography.fontSize.base,
        color: adminTheme.colors.text,
    },
    inputWithToggle: {
        paddingRight: 48,
    },
    inputDisabled: {
        backgroundColor: adminTheme.colors.surfaceLight,
        color: adminTheme.colors.textSecondary,
    },
    eyeButton: {
        position: "absolute",
        right: 14,
        top: 0,
        bottom: 0,
        justifyContent: "center",
    },
});

export default Input;
