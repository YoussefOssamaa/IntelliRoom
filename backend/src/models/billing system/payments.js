// /workspace/backend/src/models/billing system/payments.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: false, // Optional for failed payments without subscription
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["fawaterak", "kashier", "manual"], // Changed from paymob to fawaterak
      default: "fawaterak",
      trim: true,
      lowercase: true,
    },
    // Fawaterak transaction ID
    providerTransactionId: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      index: true,
    },
    // Replace paymobOrderId with fawaterkOrderId
    fawaterkOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "failed", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["EGP", "USD"],
      required: true,
      default: "EGP",
      uppercase: true,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    // Fawaterak-specific fields
    fawaterkPaymentMethodId: {
      type: String,
      trim: true,
    },
    fawaterkCustomerId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);