const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["free", "pro", "enterprise"],
      default: "free"
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    renderLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    availableFeatures: {
      type: [String],
      default: [],
    }
  },
  { timestamps: true });

  module.exports = mongoose.model('Plan', planSchema);