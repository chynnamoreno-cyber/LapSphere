import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    FlatList,
    ScrollView,
    Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import FormContainer from "../../Shared/FormContainer";
import Input from "../../Shared/Input";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import Error from "../../Shared/Error";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import mime from "mime";
import { Ionicons } from "@expo/vector-icons";
import { getJwtToken } from "../../assets/common/authToken";
import { adminTheme } from "../../assets/common/adminTheme";

const { width } = Dimensions.get("window");

const ProductForm = (props) => {
    const [pickerValue, setPickerValue] = useState("");
    const [brand, setBrand] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [images, setImages] = useState([]);
    const [mainImage, setMainImage] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [countInStock, setCountInStock] = useState("");
    const [rating, setRating] = useState(0);
    const [isFeatured, setIsFeatured] = useState(false);
    const [richDescription, setRichDescription] = useState("");
    const [numReviews, setNumReviews] = useState(0);
    const [item, setItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            return base64 ? String(base64) : null;
        } catch (_error) {
            return null;
        }
    };

    const normalizeAssetToImage = async (asset) => {
        const uri = asset?.uri;
        if (!uri) return null;

        // On web, ImagePicker often returns a `blob:` URL which can't be persisted.
        // Convert it to base64 so backend can store it as a real file.
        const base64 = asset?.base64 || (String(uri).startsWith("blob:") ? await blobUriToBase64(uri) : null);
        const inferredMime = asset?.mimeType || mime.getType(uri) || "image/jpeg";

        return {
            uri,
            local: true,
            base64: base64 || null,
            mime: inferredMime,
        };
    };

    useEffect(() => {
        if (props.route?.params?.item) {
            const i = props.route.params.item;
            setItem(i);
            setBrand(i.brand || "");
            setName(i.name || "");
            setPrice(String(i.price ?? ""));
            setDescription(i.description || "");
            setMainImage(i.image || "");
            // Initialize images array from existing product
            if (i.images && Array.isArray(i.images)) {
                setImages(i.images.map(img => ({ uri: img, local: false })));
            } else if (i.image) {
                setImages([{ uri: i.image, local: false }]);
            }
            const catId = i.category?._id || i.category?.id || "";
            setCategory(catId);
            setPickerValue(catId);
            setCountInStock(String(i.countInStock ?? ""));
        } else {
            setItem(null);
            setImages([]);
        }
        getJwtToken().then((res) => setToken(res || "")).catch(() => {});
        axios.get(`${baseURL}categories`).then((res) => setCategories(res.data)).catch(() => alert("Error loading categories"));
        if (Platform.OS !== "web") {
            ImagePicker.requestMediaLibraryPermissionsAsync().then(({ status }) => {
                if (status !== "granted") alert("Media library permission needed.");
            });
            ImagePicker.requestCameraPermissionsAsync().then(({ status }) => {
                if (status !== "granted") alert("Camera permission needed.");
            });
        }
        return () => setCategories([]);
    }, [props.route?.params]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            selectionLimit: 10,
            allowsEditing: false,
            quality: 0.35,
            base64: true,
        });
        if (result.canceled) return;

        const pickedRaw = result.assets || [];
        const normalized = (await Promise.all(pickedRaw.map(normalizeAssetToImage))).filter(Boolean);

        if (normalized.length === 0) return;

        setImages((prev) => [...prev, ...normalized]);
        if (!mainImage) {
            setMainImage(normalized[0].uri);
        }
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.35,
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const newImage = await normalizeAssetToImage(asset);
            if (!newImage) return;
            setImages((prev) => [...prev, newImage]);
            if (!mainImage) {
                setMainImage(newImage.uri);
            }
        }
    };

    const removeImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        if (mainImage === images[index].uri && newImages.length > 0) {
            setMainImage(newImages[0].uri);
        } else if (newImages.length === 0) {
            setMainImage("");
        }
    };

    const setAsMainImage = (uri) => {
        setMainImage(uri);
    };

    const addProduct = () => {
        if (isSubmitting) return;
        if (!name || !brand || !price || !description || !category || !countInStock) {
            setError("Please fill in the form correctly");
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("brand", brand);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("countInStock", countInStock);
        formData.append("richDescription", richDescription);
        formData.append("rating", rating);
        formData.append("numReviews", numReviews);
        formData.append("isFeatured", isFeatured);
        // If main image is an existing server URL, send it so backend can keep it as the primary.
        if (mainImage && String(mainImage).startsWith("http")) {
            formData.append("mainImageUrl", mainImage);
        }
        // Tell backend which existing images to retain on update.
        const existingImages = images
            .filter((img) => img?.uri && img.local === false)
            .map((img) => img.uri);
        formData.append("existingImages", JSON.stringify(existingImages));

        // Also send base64 payload for new images so backend can persist
        // them even if FormData file upload fails on some devices.
        const imagesBase64 = images
            .filter((img) => img?.local && img.base64)
            .map((img) => ({
                data: img.base64,
                mime: img.mime || mime.getType(img.uri) || "image/jpeg",
            }));
        if (imagesBase64.length > 0) {
            formData.append("imagesBase64", JSON.stringify(imagesBase64));
        }

        // Additionally send multipart files for native platforms.
        // On web you'll often get `blob:` URIs which multer can't handle, so skip them.
        images.forEach((img, index) => {
            if (!img?.uri || img.local !== true) return;
            if (String(img.uri).startsWith("blob:")) return;

            let imageUri = String(img.uri);
            if (!imageUri.startsWith("file://") && !imageUri.startsWith("http")) {
                imageUri = `file://${imageUri}`;
            }

            formData.append("images", {
                uri: imageUri,
                type: img.mime || mime.getType(imageUri) || "image/jpeg",
                name: `image_${index}_${Date.now()}.jpg`,
            });
        });

        const config = {
            headers: {
                // Let axios set the correct multipart boundary automatically.
                Authorization: "Bearer " + token,
            },
        };
        const productId = item?.id ?? item?._id;
        const thenNav = () => {
            Toast.show({ topOffset: 60, type: "success", text1: productId ? "Product updated" : "Product added" });
            setTimeout(() => navigation.navigate("Products"), 500);
        };
        const catchErr = (err) => {
            console.log('ProductForm error:', err?.response?.data || err?.message || err);
            const msg = err?.response?.data?.message || err?.message || "Something went wrong";
            Toast.show({ topOffset: 60, type: "error", text1: msg });
        };
        const request = productId
            ? axios.put(`${baseURL}products/${productId}`, formData, config)
            : axios.post(`${baseURL}products`, formData, config);

        request
            .then((res) => (res.status === 200 || res.status === 201) && thenNav())
            .catch(catchErr)
            .finally(() => setIsSubmitting(false));
    };

    return (
        <FormContainer title={item ? "Edit Product" : "Add Product"}>
            {/* Main Image Preview */}
            <View style={styles.mainImageSection}>
                <View style={styles.mainImageContainer}>
                    {mainImage ? (
                        <Image style={styles.mainImage} source={{ uri: mainImage }} />
                    ) : (
                        <View style={styles.mainImagePlaceholder}>
                            <Ionicons name="image-outline" size={48} color={adminTheme.colors.borderLight} />
                            <Text style={styles.placeholderText}>No image selected</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Image Upload Buttons */}
            <View style={styles.imageActionRow}>
                <TouchableOpacity onPress={pickImage} style={styles.imageActionBtn}>
                    <Ionicons name="images-outline" size={18} color={adminTheme.colors.text} />
                    <Text style={styles.imageActionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={takePhoto} style={styles.imageActionBtn}>
                    <Ionicons name="camera-outline" size={18} color={adminTheme.colors.text} />
                    <Text style={styles.imageActionText}>Camera</Text>
                </TouchableOpacity>
            </View>

            {/* Image Thumbnails */}
            {images.length > 0 && (
                <View style={styles.thumbnailSection}>
                    <Text style={styles.thumbnailLabel}>Selected Images ({images.length})</Text>
                    <FlatList
                        horizontal
                        data={images}
                        keyExtractor={(_, index) => String(index)}
                        renderItem={({ item: img, index }) => (
                            <View style={styles.thumbnailContainer}>
                                <TouchableOpacity
                                    onPress={() => setAsMainImage(img.uri)}
                                    style={[
                                        styles.thumbnail,
                                        mainImage === img.uri && styles.thumbnailActive,
                                    ]}
                                >
                                    <Image source={{ uri: img.uri }} style={styles.thumbnailImage} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => removeImage(index)}
                                    style={styles.removeBtn}
                                >
                                    <Ionicons name="close" size={16} color={adminTheme.colors.text} />
                                </TouchableOpacity>
                                {mainImage === img.uri && (
                                    <View style={styles.mainBadge}>
                                        <Text style={styles.mainBadgeText}>Main</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        scrollEnabled={true}
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
            )}

            {/* Form Fields */}
            <View style={styles.formSection}>
                <View style={styles.label}>
                    <Ionicons name="pricetags-outline" size={16} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.labelText}>Brand</Text>
                </View>
                <Input placeholder="Brand" name="brand" id="brand" value={brand} onChangeText={setBrand} />

                <View style={styles.label}>
                    <Ionicons name="text-outline" size={16} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.labelText}>Name</Text>
                </View>
                <Input placeholder="Product Name" name="name" id="name" value={name} onChangeText={setName} />

                <View style={styles.label}>
                    <Ionicons name="cash-outline" size={16} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.labelText}>Price</Text>
                </View>
                <Input placeholder="Price" name="price" id="price" value={price} keyboardType="numeric" onChangeText={setPrice} />

                <View style={styles.label}>
                    <Ionicons name="layers-outline" size={16} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.labelText}>Count in Stock</Text>
                </View>
                <Input placeholder="Stock Quantity" name="stock" id="stock" value={countInStock} keyboardType="numeric" onChangeText={setCountInStock} />

                <View style={styles.label}>
                    <Ionicons name="document-text-outline" size={16} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.labelText}>Description</Text>
                </View>
                <Input placeholder="Product Description" name="description" id="description" value={description} onChangeText={setDescription} />

                <View style={styles.label}>
                    <Ionicons name="list-outline" size={16} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.labelText}>Category</Text>
                </View>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={pickerValue}
                        onValueChange={(e) => {
                            setPickerValue(e);
                            setCategory(e);
                        }}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select Category" value="" />
                        {categories.map((c) => (
                            <Picker.Item key={c.id || c._id} label={c.name} value={c.id || c._id} />
                        ))}
                    </Picker>
                </View>
            </View>

            {error ? <Error message={error} /> : null}

            <View style={styles.buttonContainer}>
                <EasyButton large primary onPress={addProduct}>
                    {isSubmitting ? (
                        <ActivityIndicator color={adminTheme.colors.text} size="small" />
                    ) : (
                        <Text style={styles.buttonText}>
                            {item ? "Update Product" : "Add Product"}
                        </Text>
                    )}
                </EasyButton>
            </View>
        </FormContainer>
    );
};

const styles = StyleSheet.create({
    mainImageSection: {
        width: "100%",
        paddingHorizontal: adminTheme.spacing.md,
        alignItems: "center",
        marginBottom: adminTheme.spacing.lg,
        marginTop: adminTheme.spacing.md,
    },
    mainImageContainer: {
        width: "100%",
        maxWidth: 280,
        aspectRatio: 1,
        borderRadius: adminTheme.radius.lg,
        borderWidth: 2,
        borderColor: adminTheme.colors.border,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: adminTheme.colors.surface,
        elevation: 4,
        overflow: "hidden",
    },
    mainImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    mainImagePlaceholder: {
        justifyContent: "center",
        alignItems: "center",
        gap: adminTheme.spacing.md,
    },
    placeholderText: {
        color: adminTheme.colors.textTertiary,
        fontSize: adminTheme.typography.fontSize.sm,
    },
    imageActionRow: {
        width: "100%",
        paddingHorizontal: adminTheme.spacing.md,
        flexDirection: "row",
        justifyContent: "center",
        gap: adminTheme.spacing.md,
        marginBottom: adminTheme.spacing.lg,
    },
    imageActionBtn: {
        flex: 1,
        backgroundColor: adminTheme.colors.primary,
        borderRadius: adminTheme.radius.md,
        paddingVertical: adminTheme.spacing.lg,
        paddingHorizontal: adminTheme.spacing.md,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: adminTheme.spacing.sm,
        elevation: 2,
        minHeight: 52,
    },
    imageActionText: {
        color: adminTheme.colors.text,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.sm,
    },
    thumbnailSection: {
        width: "100%",
        paddingHorizontal: adminTheme.spacing.md,
        marginBottom: adminTheme.spacing.xl,
        paddingBottom: adminTheme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: adminTheme.colors.border,
    },
    thumbnailLabel: {
        color: adminTheme.colors.primaryLight,
        fontWeight: "600",
        marginBottom: adminTheme.spacing.md,
        fontSize: adminTheme.typography.fontSize.sm,
    },
    thumbnailContainer: {
        marginRight: adminTheme.spacing.md,
        position: "relative",
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: adminTheme.radius.md,
        borderWidth: 2,
        borderColor: adminTheme.colors.border,
        overflow: "hidden",
        backgroundColor: adminTheme.colors.surface,
    },
    thumbnailActive: {
        borderColor: adminTheme.colors.primaryLight,
        borderWidth: 3,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    removeBtn: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: adminTheme.colors.error,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        elevation: 3,
    },
    mainBadge: {
        position: "absolute",
        bottom: 4,
        right: 4,
        backgroundColor: adminTheme.colors.success,
        paddingHorizontal: adminTheme.spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
    },
    mainBadgeText: {
        color: adminTheme.colors.text,
        fontSize: 10,
        fontWeight: "bold",
    },
    formSection: {
        width: "100%",
        paddingHorizontal: adminTheme.spacing.md,
        alignItems: "center",
    },
    label: {
        width: "100%",
        marginTop: adminTheme.spacing.lg,
        marginBottom: adminTheme.spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: adminTheme.spacing.sm,
    },
    labelText: {
        color: adminTheme.colors.primaryLight,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.sm,
    },
    pickerContainer: {
        width: "100%",
        borderRadius: adminTheme.radius.md,
        backgroundColor: adminTheme.colors.surface,
        borderWidth: 1.5,
        borderColor: adminTheme.colors.border,
        overflow: "hidden",
        marginBottom: adminTheme.spacing.lg,
    },
    picker: {
        color: adminTheme.colors.text,
        backgroundColor: adminTheme.colors.surface,
    },
    buttonContainer: {
        width: "100%",
        paddingHorizontal: adminTheme.spacing.md,
        marginBottom: 100,
        marginTop: adminTheme.spacing.xl,
        alignItems: "center",
    },
    buttonText: {
        color: adminTheme.colors.text,
        fontWeight: "700",
        fontSize: adminTheme.typography.fontSize.base,
    },
});

export default ProductForm;
