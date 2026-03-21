const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { 
      type: String, 
      enum: ["order_status", "promo", "stock_alert", "general"], 
      default: "general",
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    orderStatus: { 
      type: String, 
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"], 
      default: null 
    },
    promoId: { type: mongoose.Schema.Types.ObjectId, ref: "Promo", default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // Extra data like tracking info
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

notificationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
