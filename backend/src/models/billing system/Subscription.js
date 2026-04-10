const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(  {
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
      enum: ["active", "canceled", "expired", "trial"],
      index: true,
    },

    billingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
    required: true,
    default: "monthly",
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
    cancelAtPeriodEnd: {  //Whether the subscription should stop renewing at that end date {user must cancel renewal before the end date}
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true });


module.exports = mongoose.model('Subscription', subscriptionSchema);