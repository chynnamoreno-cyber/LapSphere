/**
 * Login screen: Welcome Back design. Email/password + social (Google).
 * Connected to backend users/login and users/auth/google
 */
import React, { useState, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { loginUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";
import SocialLoginButtons from "../../Shared/SocialLoginButtons";

const Login = () => {
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (email === "" || password === "") {
            setError("Please fill in your credentials");
            return;
        }
        setError("");
        setIsSubmitting(true);
        loginUser({ email, password }, context.dispatch).finally(() =>
            setIsSubmitting(false)
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.logoBox}>
                    <Ionicons name="laptop" size={44} color="#fff" />
                </View>
                <Text style={styles.brandName}>LapSphere</Text>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>
                Log in to explore premium laptops and gear
                </Text>

                <SocialLoginButtons
                    dispatch={context.dispatch}
                    variant="outline"
                />

                <Text style={styles.divider}>Or continue with social account</Text>

                <View style={styles.form}>
                    <Input
                        placeholder="Email"
                        value={email}
                        onChangeText={(t) => setEmail(t.toLowerCase())}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Input
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        showToggle
                    />
                    <TouchableOpacity style={styles.forgetLink}>
                        <Text style={styles.forgetText}>Forget Password?</Text>
                    </TouchableOpacity>

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}
                    {isSubmitting ? (
                        <ActivityIndicator
                            size="small"
                            color="#000"
                            style={styles.loader}
                        />
                    ) : null}

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.primaryBtnText}>Sign In</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Didn&apos;t have an account?{" "}
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate("Register")}
                    >
                        <Text style={styles.registerLink}>Register</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: 40,
    },
    logoBox: {
        width: 72,
        height: 72,
        borderRadius: 16,
        backgroundColor: "#1e40af",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginBottom: 12,
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    brandName: {
        fontSize: 28,
        fontWeight: "800",
        color: "#1e40af",
        textAlign: "center",
        marginBottom: 24,
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#000",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: "#666",
        marginBottom: 24,
    },
    divider: {
        textAlign: "center",
        color: "#94a3b8",
        fontSize: 14,
        marginVertical: 20,
    },
    form: { marginTop: 8 },
    forgetLink: { alignSelf: "flex-end", marginBottom: 16 },
    forgetText: { fontSize: 14, color: "#1e40af", fontWeight: "600" },
    errorText: {
        color: "#d32f2f",
        marginBottom: 12,
        fontWeight: "600",
    },
    loader: { marginVertical: 12 },
    primaryBtn: {
        height: 52,
        backgroundColor: "#1e40af",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 32,
    },
    footerText: { fontSize: 15, color: "#666" },
    registerLink: { fontSize: 15, color: "#1e40af", fontWeight: "700" },
});

export default Login;
