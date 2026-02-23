import React, { useState, useContext, useEffect } from "react";
import { View, Text, StyleSheet, Button, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import FormContainer from "../../Shared/FormContainer";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { loginUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";

const Login = () => {
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        const user = { email, password };
        if (email === "" || password === "") {
            setError("Please fill in your credentials");
        } else {
            setError("");
            setIsSubmitting(true);
            loginUser(user, context.dispatch).finally(() => setIsSubmitting(false));
        }
    };

    useEffect(() => {
        if (context.stateUser.isAuthenticated === true) {
            navigation.navigate("User Profile");
        }
    }, [context.stateUser.isAuthenticated]);

    return (
        <FormContainer title="Login">
            <Input
                label="Email"
                placeholder="Enter your email"
                name="email"
                id="email"
                value={email}
                onChangeText={(text) => setEmail(text.toLowerCase())}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <Input
                label="Password"
                placeholder="Enter your password"
                name="password"
                id="password"
                secureTextEntry={true}
                showToggle={true}
                value={password}
                onChangeText={(text) => setPassword(text)}
            />
            <View style={styles.buttonGroup}>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {isSubmitting ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" />
                        <Text style={styles.loadingText}>Signing in...</Text>
                    </View>
                ) : null}
                <Button title="Login" onPress={() => handleSubmit()} disabled={isSubmitting} />
            </View>
            <View style={styles.buttonGroup}>
                <Text style={styles.middleText}>Don't have an account yet?</Text>
                <Button
                    title="Register"
                    onPress={() => navigation.navigate("Register")}
                />
            </View>
        </FormContainer>
    );
};

const styles = StyleSheet.create({
    buttonGroup: {
        width: "80%",
        alignItems: "center",
    },
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    loadingText: {
        marginLeft: 8,
        color: "#333",
    },
    errorText: {
        color: "#d32f2f",
        marginBottom: 8,
        fontWeight: "600",
    },
    middleText: {
        marginBottom: 20,
        alignSelf: "center",
        color: "#333",
        fontSize: 14,
    },
});

export default Login;
