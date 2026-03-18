const mongoose = require('mongoose');


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
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["stripe", "paypal", "razorpay", "manual"], // We can add more providers as needed
      trim: true,
      lowercase: true,
    },
    providerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "failed", "refunded"],
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
      enum: ["USD", "EUR","OMR", "GBP", "AED", "SAR", "EGP"],
      required: true,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model('Payment', paymentSchema);