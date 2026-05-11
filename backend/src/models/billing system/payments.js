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
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["paymob", "kashier", "manual"], // ضفنا بيموب
      default: "paymob",
      trim: true,
      lowercase: true,
    },
    // الـ Transaction ID اللي راجع من بيموب بعد الدفع
    providerTransactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // بيموب بيحتاج يعمل Order الأول، فهنحفظ الـ Order ID هنا عشان نربطهم ببعض
    paymobOrderId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "failed", "refunded", "voided"], // ضفنا voided بتاعت بيموب
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
      enum: ["EGP", "USD"], // التركيز على الجنيه المصري
      required: true,
      default: "EGP",
      uppercase: true,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);