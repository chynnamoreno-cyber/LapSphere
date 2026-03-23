import React, { useContext, useState, useCallback } from "react";
import { View, Text, ScrollView, Button, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import mime from "mime";
import baseURL from "../../assets/common/baseurl";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { logoutUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";
import Toast from "react-native-toast-message";
import AddressMapPicker from "../../Shared/AddressMapPicker";
import { getJwtToken } from "../../assets/common/authToken";

const UserProfile = () => {
    const context = useContext(AuthGlobal);
    const [userProfile, setUserProfile] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [deliveryAddress1, setDeliveryAddress1] = useState("");
    const [deliveryAddress2, setDeliveryAddress2] = useState("");
    const [deliveryCity, setDeliveryCity] = useState("");
    const [deliveryZip, setDeliveryZip] = useState("");
    const [deliveryCountry, setDeliveryCountry] = useState("Philippines");
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [profileImage, setProfileImage] = useState("");
    const [newProfileImage, setNewProfileImage] = useState("");
    const [newProfileImageBase64, setNewProfileImageBase64] = useState("");
    const [newProfileImageMime, setNewProfileImageMime] = useState("");
    const [mapVisible, setMapVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const navigation = useNavigation();

    const blobUriToBase64 = async (uri) => {
        if (!uri || !String(uri).startsWith("blob:")) return null;
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error("Failed to read blob"));
                reader.onloadend = () => {
                    const result = String(reader.result || "");
                    const commaIdx = result.indexOf(",");
                    resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : "");
                };
                reader.readAsDataURL(blob);
            });
            return base64 || null;
        } catch (_error) {
            return null;
        }
    };

    const requiredProfileFields = {
        phone: String(phone || "").trim(),
        deliveryAddress1: String(deliveryAddress1 || "").trim(),
        deliveryCity: String(deliveryCity || "").trim(),
        deliveryZip: String(deliveryZip || "").trim(),
        deliveryCountry: String(deliveryCountry || "").trim(),
    };
    const missingRequiredFields = Object.entries(requiredProfileFields)
        .filter(([, value]) => !value)
        .map(([key]) => key);
    const isCheckoutReady = missingRequiredFields.length === 0;

    const hydrateProfileForm = (profile) => {
        setUserProfile(profile);
        setName(profile?.name || "");
        setPhone(profile?.phone || "");
        setDeliveryAddress1(profile?.deliveryAddress1 || "");
        setDeliveryAddress2(profile?.deliveryAddress2 || "");
        setDeliveryCity(profile?.deliveryCity || "");
        setDeliveryZip(profile?.deliveryZip || "");
        setDeliveryCountry(profile?.deliveryCountry || "Philippines");
        setProfileImage(profile?.image || "");
        setNewProfileImage("");
        if (
            Number.isFinite(profile?.deliveryLocation?.latitude)
            && Number.isFinite(profile?.deliveryLocation?.longitude)
        ) {
            setDeliveryLocation({
                latitude: Number(profile.deliveryLocation.latitude),
                longitude: Number(profile.deliveryLocation.longitude),
            });
        } else {
            setDeliveryLocation(null);
        }
    };

    const resolveAuthUserId = () =>
        context?.stateUser?.user?.userId ||
        context?.stateUser?.user?.id ||
        context?.stateUser?.user?.sub ||
        context?.stateUser?.user?._id;

    const testBackendConnectivity = async (jwt) => {
        try {
            // Test with GET /:userId endpoint instead of non-existent /profile GET
            const userId = resolveAuthUserId();
            if (!userId) {
                console.warn("[UserProfile] No userId on JWT payload for connectivity test (using profile GET path)");
                return true;
            }
            
            const testUrl = `${baseURL}users/${userId}`;
            console.log("[UserProfile] Testing connectivity to:", testUrl);
            const response = await axios.get(testUrl, {
                headers: { Authorization: `Bearer ${jwt}` },
                timeout: 5000,
            });
            console.log("[UserProfile] Connectivity test passed!");
            return true;
        } catch (error) {
            console.error("[UserProfile] Connectivity test failed:", {
                message: error?.message,
                code: error?.code,
                status: error?.response?.status,
                baseURL: baseURL,
            });
            return false;
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (
                context.stateUser.isAuthenticated === false ||
                context.stateUser.isAuthenticated === null
            ) {
                navigation.navigate("User", { screen: "Login" });
                return;
            }
            getJwtToken()
                .then((res) => {
                    axios
                        .get(`${baseURL}users/${context.stateUser.user.userId}`, {
                            headers: { Authorization: `Bearer ${res}` },
                        })
                        .then((user) => hydrateProfileForm(user.data));
                })
                .catch((error) => console.log(error));
            return () => setUserProfile("");
        }, [context.stateUser.isAuthenticated])
    );

    const onMapPicked = (picked) => {
        setMapVisible(false);
        setDeliveryLocation(picked.coordinate);
        setDeliveryAddress1(picked.address1 || "");
        setDeliveryCity(picked.city || "");
        setDeliveryZip(picked.zip || "");
        setDeliveryCountry(picked.country || "Philippines");
        Toast.show({
            topOffset: 60,
            type: "success",
            text1: "Location selected",
            text2: "Review details, then tap Save Profile",
        });
    };

    const pickProfileFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.35,
            base64: true,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            setNewProfileImage(asset.uri);
            setNewProfileImageMime(asset.type || mime.getType(asset.uri) || "image/jpeg");
            // asset.base64 can be empty on some web environments; we'll lazily convert when uploading.
            setNewProfileImageBase64(asset.base64 || "");
            setProfileImage(asset.uri);
        }
    };

    const takeProfilePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.35,
            base64: true,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            setNewProfileImage(asset.uri);
            setNewProfileImageMime(asset.type || mime.getType(asset.uri) || "image/jpeg");
            // asset.base64 can be empty on some web environments; we'll lazily convert when uploading.
            setNewProfileImageBase64(asset.base64 || "");
            setProfileImage(asset.uri);
        }
    };

    const uploadProfilePhoto = async (jwt) => {
        if (!newProfileImage) return null;
        
        console.log("[UserProfile] Starting image upload. URI:", newProfileImage.substring(0, 100));
        
        // Test connectivity first
        const isConnected = await testBackendConnectivity(jwt);
        if (!isConnected) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Network Error",
                text2: `Cannot reach server at ${baseURL}. Check WiFi connection.`,
            });
            throw new Error("Backend unreachable");
        }

        // **PRIORITY 1: Try sending as base64 (works best on web)**
        let base64ToSend = newProfileImageBase64;
        
        // **PRIORITY 2: If ImagePicker didn't return base64, read file manually**
        if ((!base64ToSend || base64ToSend.length === 0) && newProfileImage) {
            console.log("[UserProfile] ImagePicker base64 empty, attempting manual conversion...");
            
            try {
                // Simpler approach: just send the file directly via multipart, don't try to convert to base64
                // This avoids the complexity of FileReader on different platforms
                console.log("[UserProfile] Will use multipart file upload instead of base64");
                base64ToSend = ""; // Force multipart path
            } catch (conversionError) {
                console.warn("[UserProfile] Will use multipart upload:", conversionError.message);
                base64ToSend = "";
            }
        }

        // **PRIORITY 3: Send as base64 JSON if we have it**
        if (base64ToSend && base64ToSend.length > 0) {
            console.log("[UserProfile] Using base64 JSON upload method. Size:", base64ToSend.length, "bytes");

            try {
                console.log("[UserProfile] Uploading to:", `${baseURL}users/profile/image`);
                const response = await axios.put(
                    `${baseURL}users/profile/image`,
                    {
                        imageBase64: {
                            data: base64ToSend,
                            mime: newProfileImageMime || "image/jpeg",
                        },
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${jwt}`,
                            "Content-Type": "application/json",
                        },
                        timeout: 30000,
                    }
                );

                console.log("[UserProfile] Image upload successful! Response:", response.status);
                setNewProfileImage("");
                setNewProfileImageBase64("");
                setNewProfileImageMime("");
                return response.data;
            } catch (error) {
                const status = error?.response?.status;
                const errorMsg = error?.response?.data?.message || error?.message;
                const errorCode = error?.code;

                console.error("[UserProfile] Upload error:", {
                    status,
                    message: errorMsg,
                    code: errorCode,
                    fullError: error?.message,
                });

                let displayMsg = "Upload failed. ";
                if (!error?.response) {
                    displayMsg += "Network error. Check WiFi connection.";
                } else if (status === 401) {
                    displayMsg += "Your session expired. Please login again.";
                } else if (status === 400) {
                    displayMsg += errorMsg || "Image format or size error.";
                } else if (status >= 500) {
                    displayMsg += "Server error. Try again in a moment.";
                } else {
                    displayMsg += errorMsg || "Please try another photo.";
                }

                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Image upload failed",
                    text2: displayMsg,
                });
                throw error;
            }
        }

        // **PRIORITY 4: Fall back to multipart file upload**
        else {
            console.log("[UserProfile] Using multipart file upload method");

            const formData = new FormData();
            
            // Clean up the URI - don't add file:// prefix if it's already there or has content://
            let fileUri = newProfileImage;
            if (!fileUri.startsWith("file://") && !fileUri.startsWith("content://")) {
                // Add file:// only if it's a bare path
                if (!fileUri.startsWith("/")) {
                    fileUri = `file://${fileUri}`;
                } else {
                    fileUri = `file://${fileUri}`;
                }
            }
            
            console.log("[UserProfile] Final file URI:", fileUri);
            
            formData.append("image", {
                uri: fileUri,
                type: newProfileImageMime || "image/jpeg",
                name: `profile-${Date.now()}.jpg`,
            });

            try {
                console.log("[UserProfile] Uploading to:", `${baseURL}users/profile/image`);
                const response = await axios.put(`${baseURL}users/profile/image`, formData, {
                    headers: { Authorization: `Bearer ${jwt}` },
                    timeout: 30000,
                });

                console.log("[UserProfile] Image upload successful! Response:", response.status);
                setNewProfileImage("");
                setNewProfileImageBase64("");
                setNewProfileImageMime("");
                return response.data;
            } catch (error) {
                const status = error?.response?.status;
                const errorMsg = error?.response?.data?.message || error?.message;
                const errorCode = error?.code;

                console.error("[UserProfile] Upload error:", {
                    status,
                    message: errorMsg,
                    code: errorCode,
                    fullError: error?.message,
                });

                let displayMsg = "Upload failed. ";
                if (!error?.response) {
                    displayMsg += "Network error. Check WiFi connection.";
                } else if (status === 401) {
                    displayMsg += "Your session expired. Please login again.";
                } else if (status === 400) {
                    displayMsg += errorMsg || "Image format or size error.";
                } else if (status >= 500) {
                    displayMsg += "Server error. Try again in a moment.";
                } else {
                    displayMsg += errorMsg || "Please try another photo.";
                }

                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Image upload failed",
                    text2: displayMsg,
                });
                throw error;
            }
        }
    };

    const saveProfile = async () => {
        try {
            setIsSaving(true);
            const jwt = await getJwtToken();
            if (!jwt) {
                Toast.show({ topOffset: 60, type: "error", text1: "Session expired", text2: "Please login again" });
                return;
            }

            // Upload profile photo if one was selected
            if (newProfileImage) {
                try {
                    await uploadProfilePhoto(jwt);
                } catch (_error) {
                    // Stop profile update if image upload fails
                    // Error toast already shown to user by uploadProfilePhoto
                    setIsSaving(false);
                    return;
                }
            }

            const payload = {
                name,
                phone,
                deliveryAddress1,
                deliveryAddress2,
                deliveryCity,
                deliveryZip,
                deliveryCountry,
                ...(deliveryLocation ? { deliveryLocation } : {}),
            };

            const response = await axios.put(`${baseURL}users/profile`, payload, {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            hydrateProfileForm(response.data);
            Toast.show({ 
                topOffset: 60, 
                type: "success", 
                text1: "Profile updated successfully",
                text2: "Your profile changes have been saved"
            });
        } catch (error) {
            const errorMsg = error?.response?.data?.message || error.message || "Unknown error";
            Toast.show({ 
                topOffset: 60, 
                type: "error", 
                text1: "Failed to save profile",
                text2: errorMsg
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.screen}>
            <View style={styles.headerBackground} />
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.nameText}>
                                {userProfile ? userProfile.name : ""}
                            </Text>
                            <Text style={styles.emailText}>
                                {userProfile ? userProfile.email : ""}
                            </Text>
                        </View>
                        {userProfile && userProfile.isAdmin ? (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>ADMIN</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.statusRow}>
                        <View style={[
                            styles.completionBadge,
                            isCheckoutReady ? styles.completeBadge : styles.incompleteBadge,
                        ]}
                        >
                            <Text style={styles.completionBadgeText}>
                                {isCheckoutReady ? "Checkout Ready" : "Profile Incomplete"}
                            </Text>
                        </View>
                        {!isCheckoutReady ? (
                            <Text style={styles.missingFieldsText}>
                                Missing: {missingRequiredFields.join(", ")}
                            </Text>
                        ) : null}
                    </View>

                    <View style={styles.avatarSection}>
                        <Image
                            source={{
                                uri:
                                    profileImage
                                    || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
                            }}
                            style={styles.avatar}
                        />
                        <View style={styles.imageButtonsRow}>
                            <TouchableOpacity style={styles.imageBtn} onPress={pickProfileFromGallery}>
                                <Text style={styles.imageBtnText}>Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.imageBtn} onPress={takeProfilePhoto}>
                                <Text style={styles.imageBtnText}>Camera</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.sectionHeader}>Account Info</Text>
                    <Input label="Name" placeholder="Your name" value={name} onChangeText={setName} />
                    <Input label="Phone" placeholder="Your phone number" value={phone} keyboardType="numeric" onChangeText={setPhone} />

                    <Text style={styles.sectionHeader}>Delivery Address</Text>
                    <Input label="Address Line 1" placeholder="Street, building, etc." value={deliveryAddress1} onChangeText={setDeliveryAddress1} />
                    <Input label="Address Line 2 (optional)" placeholder="Unit, floor, etc." value={deliveryAddress2} onChangeText={setDeliveryAddress2} />
                    <Input label="City" placeholder="City or municipality" value={deliveryCity} onChangeText={setDeliveryCity} />
                    <Input label="Zip Code" placeholder="Postal/Zip code" value={deliveryZip} keyboardType="numeric" onChangeText={setDeliveryZip} />
                    <Input label="Country" placeholder="Country" value={deliveryCountry} onChangeText={setDeliveryCountry} />

                    <TouchableOpacity style={styles.mapButton} onPress={() => setMapVisible(true)}>
                        <Text style={styles.mapButtonText}>📍 Set Address from Map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryBtn, isSaving && styles.primaryBtnDisabled]}
                        disabled={isSaving}
                        onPress={saveProfile}
                    >
                        <Text style={styles.primaryBtnText}>
                            {isSaving ? "Saving..." : "Save Profile"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.signOutBtn}
                        onPress={() => {
                            logoutUser(context.dispatch);
                        }}
                    >
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <AddressMapPicker
                visible={mapVisible}
                initialLocation={deliveryLocation}
                onClose={() => setMapVisible(false)}
                onPicked={onMapPicked}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#020617", // midnight blue backdrop
    },
    headerBackground: {
        position: "absolute",
        top: -80,
        left: -40,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: "#0b1120",
        opacity: 0.9,
    },
    container: {
        paddingTop: 40,
        paddingHorizontal: 18,
        paddingBottom: 32,
    },
    card: {
        borderRadius: 28,
        backgroundColor: "#ffffff",
        paddingHorizontal: 20,
        paddingVertical: 22,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    nameText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0f172a",
    },
    adminBadge: {
        backgroundColor: "#e91e63",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 4,
        marginTop: 8,
    },
    adminBadgeText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 13,
        letterSpacing: 1,
    },
    statusRow: {
        marginTop: 14,
    },
    mapButton: {
        backgroundColor: "#1976d2",
        marginHorizontal: 10,
        marginVertical: 10,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    mapButtonText: {
        color: "white",
        fontWeight: "600",
    },
    completionBadge: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 6,
        alignSelf: "flex-start",
    },
    completeBadge: {
        backgroundColor: "#2e7d32",
    },
    incompleteBadge: {
        backgroundColor: "#d32f2f",
    },
    completionBadgeText: {
        color: "white",
        fontWeight: "700",
        letterSpacing: 0.4,
    },
    missingFieldsText: {
        marginTop: 6,
        color: "#b71c1c",
        fontSize: 11,
        textAlign: "center",
    },
    avatarSection: {
        marginTop: 22,
        alignItems: "center",
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
        alignSelf: "flex-start",
        marginLeft: "6%",
        marginTop: 20,
        marginBottom: 6,
    },
    emailText: {
        fontSize: 15,
        color: "#555",
        marginBottom: 4,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#ddd",
        marginBottom: 10,
    },
    imageButtonsRow: {
        flexDirection: "row",
        justifyContent: "center",
        columnGap: 12,
        marginBottom: 8,
    },
    imageBtn: {
        backgroundColor: "#020617",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    imageBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 13,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1f2937",
        marginTop: 18,
        marginBottom: 6,
    },
    emailText: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 2,
    },
    primaryBtn: {
        marginTop: 18,
        backgroundColor: "#2563eb",
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryBtnDisabled: {
        opacity: 0.7,
    },
    primaryBtnText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 15,
    },
    signOutBtn: {
        marginTop: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#fecaca",
        paddingVertical: 10,
        alignItems: "center",
    },
    signOutText: {
        color: "#b91c1c",
        fontWeight: "600",
        fontSize: 14,
    },
});

export default UserProfile;
