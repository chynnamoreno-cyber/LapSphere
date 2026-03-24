import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import mime from "mime";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";

const MAX_IMAGES = 3;

const LeaveReview = ({ route, navigation }) => {
    const { orderId, productId, productName } = route.params || {};
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [existingReview, setExistingReview] = useState(null);
    const [existingImages, setExistingImages] = useState([]);
    const [pickedImages, setPickedImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [eligibility, setEligibility] = useState({ canReview: true, reason: "" });

    const totalMediaCount = existingImages.length + pickedImages.length;

    const canSubmit = useMemo(() => {
        return Number(rating) >= 1 && Number(rating) <= 5 && String(comment || "").trim().length > 0;
    }, [rating, comment]);

    useEffect(() => {
        let isMounted = true;

        const loadExisting = async () => {
            if (!productId || !orderId) {
                setEligibility({ canReview: false, reason: "Missing product or order reference" });
                setLoading(false);
                return;
            }

            try {
                const jwt = await getJwtToken();
                const eligibilityRes = await axios.get(`${baseURL}products/${productId}/reviews/eligibility`, {
                    headers: { Authorization: `Bearer ${jwt || ""}` },
                    params: { orderId },
                });

                const canReview = eligibilityRes?.data?.canReview === true;
                const reason = String(eligibilityRes?.data?.reason || "");
                if (!isMounted) return;
                setEligibility({ canReview, reason });

                if (!canReview) {
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${baseURL}products/${productId}/reviews/me`, {
                    headers: { Authorization: `Bearer ${jwt || ""}` },
                    params: { orderId },
                });

                if (!isMounted) return;
                const review = response.data?.review || null;
                setExistingReview(review);
                if (review) {
                    setRating(Number(review.rating || 5));
                    setComment(review.comment || "");
                    setExistingImages(Array.isArray(review.images) ? review.images : []);
                }
            } catch (_error) {
                if (isMounted) {
                    Toast.show({ topOffset: 60, type: "error", text1: "Failed to load review data" });
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadExisting();

        return () => {
            isMounted = false;
        };
    }, [orderId, productId]);

    const pickImages = async () => {
        const remain = MAX_IMAGES - totalMediaCount;
        if (remain <= 0) {
            Toast.show({ topOffset: 60, type: "error", text1: `Max ${MAX_IMAGES} images only` });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            quality: 0.9,
            selectionLimit: remain,
            base64: true,
        });

        if (result.canceled) return;

        const selectedAssets = (result.assets || [])
            .filter((asset) => asset?.uri)
            .map((asset) => ({
                uri: asset.uri,
                base64: asset.base64 || "",
                mime: asset.mimeType || mime.getType(asset.uri) || "image/jpeg",
            }));
        if (!selectedAssets.length) return;

        const capped = selectedAssets.slice(0, remain);
        setPickedImages((prev) => [...prev, ...capped]);
    };

    const removePickedImage = (uri) => {
        setPickedImages((prev) => prev.filter((img) => img?.uri !== uri));
    };

    const removeExistingImage = (uri) => {
        setExistingImages((prev) => prev.filter((img) => img !== uri));
    };

    const appendImageFile = (formData, uri) => {
        // Keep Android content:// URIs unchanged. Prefix only plain absolute file paths.
        let uploadUri = String(uri || "").trim();
        if (!uploadUri) return;
        if (!uploadUri.startsWith("file://") && !uploadUri.startsWith("content://") && !uploadUri.startsWith("ph://")) {
            uploadUri = `file://${uploadUri}`;
        }

        const inferredType = mime.getType(uploadUri) || "image/jpeg";
        const rawName = uploadUri.split("?")[0].split("/").pop();
        const extension = mime.getExtension(inferredType) || "jpg";
        const fileName = rawName && rawName.includes(".") ? rawName : `review-${Date.now()}.${extension}`;

        formData.append("images", {
            uri: uploadUri,
            type: inferredType,
            name: fileName,
        });
    };

    const getErrorMessage = (error) => {
        const data = error?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        if (data?.message) return data.message;
        if (error?.message) return error.message;
        return "Failed to submit review";
    };

    const buildBase64ImagesFromAssets = async (assets) => {
        const out = [];
        for (const asset of assets || []) {
            const cleanUri = String(asset?.uri || "").trim();
            if (!cleanUri) continue;

            if (asset?.base64) {
                out.push({
                    data: String(asset.base64),
                    mime: asset?.mime || mime.getType(cleanUri) || "image/jpeg",
                });
                continue;
            }

            try {
                const data = await FileSystem.readAsStringAsync(cleanUri, {
                    encoding: "base64",
                });
                if (!data) continue;

                out.push({
                    data,
                    mime: asset?.mime || mime.getType(cleanUri) || "image/jpeg",
                });
            } catch (error) {
                console.warn("[LeaveReview] Failed to convert image to base64:", cleanUri, error?.message || error);
            }
        }
        return out;
    };

    const submit = async () => {
        if (saving || !canSubmit || !eligibility.canReview) return;

        try {
            setSaving(true);
            const jwt = await getJwtToken();

            if (!jwt) {
                Toast.show({ topOffset: 60, type: "error", text1: "Please log in again" });
                return;
            }

            const eligibilityRes = await axios.get(`${baseURL}products/${productId}/reviews/eligibility`, {
                headers: { Authorization: `Bearer ${jwt || ""}` },
                params: { orderId },
            });

            if (eligibilityRes?.data?.canReview !== true) {
                const reason = String(eligibilityRes?.data?.reason || "You can only review delivered purchases");
                setEligibility({ canReview: false, reason });
                Toast.show({ topOffset: 60, type: "error", text1: reason });
                return;
            }

            const payload = {
                rating: String(rating),
                comment: String(comment || "").trim(),
                orderId: String(orderId || ""),
                existingImages,
            };

            const config = {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
            };

            // On Android, multipart uploads can fail with generic Network Error.
            // Use JSON + base64 images instead for reliability.
            const hasNewImages = pickedImages.length > 0;
            let body = payload;
            if (hasNewImages) {
                const imagesBase64 = await buildBase64ImagesFromAssets(pickedImages);
                body = {
                    ...payload,
                    imagesBase64,
                };
            }

            if (existingReview?.id || existingReview?._id) {
                const reviewId = existingReview.id || existingReview._id;
                await axios.put(`${baseURL}products/${productId}/reviews/${reviewId}`, body, config);
                Toast.show({ topOffset: 60, type: "success", text1: "Review updated" });
            } else {
                await axios.post(`${baseURL}products/${productId}/reviews`, body, config);
                Toast.show({ topOffset: 60, type: "success", text1: "Review submitted" });
            }

            // Navigate back to Product Detail screen
            setTimeout(() => {
                navigation.goBack();
            }, 600);
        } catch (error) {
            const msg = getErrorMessage(error);
            console.log("[LeaveReview] submit error:", msg, error?.response?.status || "no-status");
            Toast.show({ topOffset: 60, type: "error", text1: msg });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="small" color="#111" />
                <Text style={styles.loadingText}>Loading review form...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{existingReview ? "Edit Review" : "Leave a Review"}</Text>
            <Text style={styles.subtitle}>{productName || "Product"}</Text>

            {!eligibility.canReview ? (
                <View style={styles.blockedBox}>
                    <Text style={styles.blockedTitle}>Review not available</Text>
                    <Text style={styles.blockedText}>{eligibility.reason || "You can only review delivered purchases."}</Text>
                </View>
            ) : null}

            <View style={styles.field}>
                <Text style={styles.label}>Rating</Text>
                <Text style={styles.ratingHint}>Tap a star (1–5)</Text>
                <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            accessibilityRole="button"
                            accessibilityLabel={`${star} stars`}
                        >
                            <Ionicons
                                name={Number(rating) >= star ? "star" : "star-outline"}
                                size={40}
                                color="#f5a623"
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.ratingValue}>{Number(rating)} / 5</Text>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Review</Text>
                <TextInput
                    style={styles.commentInput}
                    placeholder="Write your review here"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.field}>
                <View style={styles.mediaHeader}>
                    <Text style={styles.label}>Media ({totalMediaCount}/{MAX_IMAGES})</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={pickImages}>
                        <Text style={styles.addBtnText}>+ Add Images</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {existingImages.map((uri) => (
                        <View key={`existing-${uri}`} style={styles.imageItem}>
                            <Image source={{ uri }} style={styles.image} />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => removeExistingImage(uri)}>
                                <Text style={styles.removeBtnText}>x</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {pickedImages.map((img) => (
                        <View key={`picked-${img.uri}`} style={styles.imageItem}>
                            <Image source={{ uri: img.uri }} style={styles.image} />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => removePickedImage(img.uri)}>
                                <Text style={styles.removeBtnText}>x</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, (!canSubmit || saving) && styles.submitBtnDisabled]}
                disabled={!canSubmit || saving || !eligibility.canReview}
                onPress={submit}
            >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Review</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f6f6f6" },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
    loadingText: { marginTop: 8, color: "#555" },
    title: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
    subtitle: { marginTop: 4, color: "#666", marginBottom: 16 },
    field: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: "600", color: "#222", marginBottom: 6 },
    ratingHint: { fontSize: 12, color: "#666", marginBottom: 8 },
    starRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 280,
        paddingVertical: 8,
        paddingHorizontal: 4,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 6,
    },
    ratingValue: { fontSize: 14, fontWeight: "700", color: "#b45309" },
    commentInput: {
        minHeight: 100,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#111",
    },
    mediaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    addBtn: { backgroundColor: "#1976d2", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    addBtnText: { color: "#fff", fontWeight: "600" },
    imageItem: { marginRight: 10, position: "relative" },
    image: { width: 86, height: 86, borderRadius: 10, backgroundColor: "#ddd" },
    removeBtn: {
        position: "absolute",
        top: -8,
        right: -8,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#d32f2f",
        justifyContent: "center",
        alignItems: "center",
    },
    removeBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    submitBtn: {
        backgroundColor: "#111",
        borderRadius: 10,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },
    submitBtnDisabled: { backgroundColor: "#888" },
    submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    blockedBox: {
        backgroundColor: "#fff4f4",
        borderColor: "#f5c2c7",
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    blockedTitle: { color: "#842029", fontWeight: "700", marginBottom: 4 },
    blockedText: { color: "#842029" },
});

export default LeaveReview;
