export function getNotificationTarget({ data = {}, isAdmin = false } = {}) {
    const routeHint = String(data.route || "").toLowerCase();
    const typeHint = String(data.type || "").toLowerCase();
    const orderId = data.orderId ? String(data.orderId) : "";

    if (routeHint === "admin-orders") {
        return {
            tab: "Admin",
            stackScreen: "Orders",
            params: orderId ? { focusOrderId: orderId } : undefined,
        };
    }

    if (routeHint === "order-details" || orderId) {
        if (isAdmin) {
            return {
                tab: "Admin",
                stackScreen: "Orders",
                params: { focusOrderId: orderId },
            };
        }

        return {
            tab: "User",
            stackScreen: "Order Details",
            params: { orderId },
        };
    }

    if (routeHint === "notifications" || typeHint === "promo") {
        return {
            tab: "User",
            stackScreen: "Notification Detail",
            params: {},
        };
    }

    return null;
}
