import mongoose from "mongoose";
import orderItemSchema from "./orderItem.js";

const orderSchema = new mongoose.Schema(
  {
    // 1. Core Info
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],

    // 2. Shipping & Contact
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      zipCode: { type: String, required: true },
      phone: { type: String, required: true },
    },
    orderNotes: { type: String, default: "" },

    // 3. Financial Breakdown
    itemsPrice: { type: Number, required: true, default: 0.0 }, // Just the furniture
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 }, // Grand total

    // 4. Payment Info
    paymentMethod: { type: String, required: true }, // e.g., 'Stripe', 'PayPal'
    transactionId: { type: String }, // Provided by Stripe/PayPal after success
    isPaid: { type: Boolean, default: false },
    paidAt: Date,

    // 5. Fulfillment Info
    status: {
      type: String,
      enum: ["pending", "paid", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    trackingNumber: { type: String },
    shippingCarrier: { type: String },
    deliveredAt: Date,
  },
  { timestamps: true }
);

// We update the pre-save hook to calculate the full breakdown!
orderSchema.pre("save", function (next) {
  // Calculate base items price
  this.itemsPrice = this.items.reduce((total, item) => {
    return total + item.priceAtAdd * item.quantity;
  }, 0);

  // In a real app, you'd calculate actual tax and shipping here based on rules.
  // For now, let's assume flat rates or zeroes if not set.
  this.taxPrice = this.taxPrice || 0; 
  this.shippingPrice = this.shippingPrice || 0;

  // The Grand Total
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;
  
  next();
});

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ user: 1 });

export default mongoose.model("Order", orderSchema);