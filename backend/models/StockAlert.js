const mongoose = require("mongoose");

const stockAlertSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    stockLevel: { type: Number, required: true },
    threshold: { type: Number, required: true, default: 10 },
    type: { type: String, enum: ["low", "out_of_stock"], default: "low" },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

stockAlertSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

stockAlertSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("StockAlert", stockAlertSchema);
