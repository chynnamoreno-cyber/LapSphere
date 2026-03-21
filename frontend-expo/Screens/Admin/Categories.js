import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Dimensions,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import baseURL from "../../assets/common/baseurl";
import axios from "axios";
import { getJwtToken } from "../../assets/common/authToken";
import { adminTheme } from "../../assets/common/adminTheme";

var { width } = Dimensions.get("window");

const Item = ({ item, onEdit, onDelete, isDeleting }) => (
    <View style={styles.item}>
        <View style={styles.itemContent}>
            <Ionicons name="folder-outline" size={20} color={adminTheme.colors.primaryLight} />
            <Text style={styles.itemName}>{item.name}</Text>
        </View>
        <View style={styles.itemActions}>
            <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => onEdit(item)}
            >
                <Ionicons name="pencil-outline" size={18} color={adminTheme.colors.primaryLight} />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => onDelete(item.id || item._id)}
            >
                {isDeleting ? (
                    <ActivityIndicator color={adminTheme.colors.error} size="small" />
                ) : (
                    <Ionicons name="trash-outline" size={18} color={adminTheme.colors.error} />
                )}
            </TouchableOpacity>
        </View>
    </View>
);

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [categoryName, setCategoryName] = useState("");
    const [token, setToken] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        getJwtToken().then((res) => setToken(res || "")).catch(() => {});
        axios.get(`${baseURL}categories`).then((res) => setCategories(res.data)).catch(() => alert("Error loading categories"));
        return () => {
            setCategories([]);
            setToken("");
        };
    }, []);

    const resetEdit = () => {
        setEditingId(null);
        setCategoryName("");
    };

    const submitCategory = () => {
        if (!categoryName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const payload = { name: categoryName.trim() };
        const request = editingId
            ? axios.put(`${baseURL}categories/${editingId}`, payload, config)
            : axios.post(`${baseURL}categories`, payload, config);

        request
            .then((res) => {
                if (editingId) {
                    const updated = res.data;
                    setCategories((prev) =>
                        prev.map((item) =>
                            (item.id || item._id) === editingId ? updated : item
                        )
                    );
                } else {
                    setCategories((prev) => [...prev, res.data]);
                }
                resetEdit();
            })
            .catch(() => alert(editingId ? "Error updating category" : "Error adding category"))
            .finally(() => setIsSubmitting(false));
    };

    const startEdit = (item) => {
        setEditingId(item.id || item._id);
        setCategoryName(item.name || "");
    };

    const deleteCategory = (id) => {
        if (deletingId) return;
        setDeletingId(id);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        axios
            .delete(`${baseURL}categories/${id}`, config)
            .then(() => {
                setCategories((prev) => prev.filter((item) => (item.id || item._id) !== id));
                if (editingId === id) resetEdit();
            })
            .catch(() => alert("Error deleting category"))
            .finally(() => setDeletingId(null));
    };

    return (
        <View style={styles.container}>
            <View style={styles.listContainer}>
                <FlatList
                    data={categories}
                    renderItem={({ item, index }) => (
                        <Item
                            item={item}
                            index={index}
                            onEdit={startEdit}
                            onDelete={deleteCategory}
                            isDeleting={deletingId === (item.id || item._id)}
                        />
                    )}
                    keyExtractor={(item) => String(item.id || item._id)}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="folder-open-outline" size={48} color={adminTheme.colors.borderLight} />
                            <Text style={styles.emptyText}>No categories yet</Text>
                        </View>
                    }
                />
            </View>
            <View style={styles.bottomBar}>
                <View style={styles.barTitleContainer}>
                    <Ionicons name="add-circle-outline" size={20} color={adminTheme.colors.primaryLight} />
                    <Text style={styles.barTitle}>{editingId ? "Update Category" : "Add Category"}</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        value={categoryName}
                        style={styles.input}
                        onChangeText={setCategoryName}
                        placeholder="Category name"
                        placeholderTextColor={adminTheme.colors.textTertiary}
                    />
                </View>
                <View style={styles.buttonsRow}>
                    <EasyButton medium primary onPress={submitCategory}>
                        {isSubmitting ? (
                            <ActivityIndicator color={adminTheme.colors.text} size="small" />
                        ) : (
                            <Text style={styles.buttonLabel}>
                                {editingId ? "Update" : "Add"}
                            </Text>
                        )}
                    </EasyButton>
                    {editingId ? (
                        <EasyButton medium secondary onPress={resetEdit}>
                            <Text style={styles.buttonLabel}>Cancel</Text>
                        </EasyButton>
                    ) : null}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "relative",
        height: "100%",
        backgroundColor: adminTheme.colors.background,
    },
    listContainer: {
        marginBottom: 120,
        paddingBottom: adminTheme.spacing.lg,
    },
    emptyState: {
        height: 300,
        justifyContent: "center",
        alignItems: "center",
        gap: adminTheme.spacing.md,
    },
    emptyText: {
        color: adminTheme.colors.textTertiary,
        fontSize: adminTheme.typography.fontSize.base,
    },
    bottomBar: {
        backgroundColor: adminTheme.colors.surface,
        width: width,
        minHeight: 120,
        padding: adminTheme.spacing.md,
        borderTopWidth: 2,
        borderTopColor: adminTheme.colors.border,
        flexDirection: "column",
        gap: adminTheme.spacing.md,
        position: "absolute",
        bottom: 0,
        left: 0,
    },
    barTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: adminTheme.spacing.sm,
    },
    barTitle: {
        color: adminTheme.colors.primaryLight,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.base,
    },
    inputContainer: {
        width: "100%",
    },
    input: {
        height: 44,
        borderColor: adminTheme.colors.border,
        borderWidth: 1.5,
        borderRadius: adminTheme.radius.md,
        paddingHorizontal: adminTheme.spacing.md,
        backgroundColor: adminTheme.colors.background,
        color: adminTheme.colors.text,
    },
    buttonsRow: {
        flexDirection: "row",
        gap: adminTheme.spacing.md,
        justifyContent: "center",
    },
    buttonLabel: {
        color: adminTheme.colors.text,
        fontWeight: "bold",
        fontSize: adminTheme.typography.fontSize.sm,
    },
    item: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        padding: adminTheme.spacing.md,
        margin: adminTheme.spacing.md,
        backgroundColor: adminTheme.colors.surface,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: adminTheme.radius.md,
        borderLeftWidth: 4,
        borderLeftColor: adminTheme.colors.primaryLight,
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: adminTheme.spacing.md,
        flex: 1,
    },
    itemName: {
        color: adminTheme.colors.text,
        fontWeight: "600",
        fontSize: adminTheme.typography.fontSize.base,
    },
    itemActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: adminTheme.spacing.md,
    },
    actionIcon: {
        padding: adminTheme.spacing.sm,
        borderRadius: adminTheme.radius.md,
        backgroundColor: adminTheme.colors.surfaceLight,
    },
    actionButton: {
        marginLeft: adminTheme.spacing.md,
    },
});

export default Categories;
