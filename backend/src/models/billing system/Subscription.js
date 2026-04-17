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
      enum: ["active", "canceled", "expired", "trial", "past_due"], // ضفنا past_due لو الدفع فشل
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
      default: "monthly",
    },
    // الـ Token الخاص بكارت العميل المربوط من بيموب عشان التجديد التلقائي
    paymobCardToken: {
      type: String,
      select: false, // مخفي لزيادة الأمان
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