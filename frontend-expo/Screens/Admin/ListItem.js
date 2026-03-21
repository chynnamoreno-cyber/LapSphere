import React, { useState } from "react";
import {
    View,
    StyleSheet,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    Modal,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import { adminTheme } from "../../assets/common/adminTheme";

var { width } = Dimensions.get("window");

const ListItem = ({ item, index, deleteProduct, isDeleting = false }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const navigation = useNavigation();
    const itemId = item.id || item._id;

    return (
        <View>
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={20} color={adminTheme.colors.text} />
                        </TouchableOpacity>
                        <EasyButton
                            medium
                            secondary
                            onPress={() => {
                                navigation.navigate("ProductForm", { item });
                                setModalVisible(false);
                            }}
                        >
                            <Text style={styles.textStyle}>Edit</Text>
                        </EasyButton>
                        <EasyButton
                            medium
                            danger
                            onPress={() => {
                                deleteProduct(itemId);
                                setModalVisible(false);
                            }}
                        >
                            <Text style={styles.textStyle}>Delete</Text>
                        </EasyButton>
                    </View>
                </View>
            </Modal>
            <TouchableOpacity
                onPress={() =>
                    navigation.navigate("Home", {
                        screen: "Product Detail",
                        params: { item },
                    })
                }
                onLongPress={() => setModalVisible(true)}
                style={[
                    styles.container,
                    {
                        backgroundColor: index % 2 === 0 ? adminTheme.colors.surface : adminTheme.colors.surfaceLight,
                    },
                ]}
            >
                <Image
                    source={item.image ? { uri: item.image } : null}
                    resizeMode="cover"
                    style={styles.image}
                />

                <View style={styles.infoColumn}>
                    <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                        {item.name || ""}
                    </Text>
                    <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                        {item.brand} · {item.category ? item.category.name : "Uncategorized"}
                    </Text>
                    <Text style={styles.price} numberOfLines={1} ellipsizeMode="tail">
                        $ {item.price}
                    </Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("ProductForm", { item })}
                    >
                        <Ionicons name="create-outline" size={18} color={adminTheme.colors.primaryLight} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => deleteProduct(itemId)}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color={adminTheme.colors.error} />
                        ) : (
                            <Ionicons name="trash-outline" size={18} color={adminTheme.colors.error} />
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        padding: adminTheme.spacing.sm,
        width: "100%",
        borderBottomWidth: 1,
        borderBottomColor: adminTheme.colors.border,
        alignItems: "center",
    },
    image: {
        borderRadius: adminTheme.radius.md,
        width: 56,
        height: 56,
        margin: adminTheme.spacing.xs,
        backgroundColor: adminTheme.colors.background,
    },
    infoColumn: {
        flex: 1,
        marginHorizontal: adminTheme.spacing.sm,
    },
    name: {
        color: adminTheme.colors.text,
        fontSize: adminTheme.typography.fontSize.sm,
        fontWeight: "600",
        marginBottom: 2,
    },
    metaText: {
        color: adminTheme.colors.textSecondary,
        fontSize: adminTheme.typography.fontSize.xs,
        marginBottom: 2,
    },
    price: {
        color: adminTheme.colors.primaryLight,
        fontSize: adminTheme.typography.fontSize.sm,
        fontWeight: "700",
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: adminTheme.spacing.sm,
        gap: adminTheme.spacing.md,
        flexShrink: 0,
    },
    actionButton: {
        padding: adminTheme.spacing.sm,
        borderRadius: adminTheme.radius.md,
        backgroundColor: adminTheme.colors.surfaceLight,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    modalView: {
        margin: adminTheme.spacing.xl,
        backgroundColor: adminTheme.colors.surface,
        borderRadius: adminTheme.radius.lg,
        padding: adminTheme.spacing.xl,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    closeButton: {
        alignSelf: "flex-end",
        position: "absolute",
        top: adminTheme.spacing.md,
        right: adminTheme.spacing.md,
        padding: adminTheme.spacing.sm,
    },
    textStyle: {
        color: adminTheme.colors.text,
        fontWeight: "bold",
    },
});

export default ListItem;
