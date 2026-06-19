// /workspace/backend/src/models/billing system/Subscription.js
import mongoose from 'mongoose';


const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "expired", "trial", "past_due"],
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
      default: "monthly",
    },
    // Replace paymobCardToken with Fawaterak equivalent
    fawaterkCardToken: {
      type: String,
      select: false, // Hidden for security
    },
    // Store Fawaterak customer ID for recurring billing
    fawaterkCustomerId: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    renewalDate: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Subscription', subscriptionSchema);