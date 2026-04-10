import mongoose from "mongoose";
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
    // billingCycle: {   added to subscription model instead of plan model
    //   type: String,
    //   enum: ["monthly", "yearly"],
    //   default: "monthly",
    // },
    renderLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    model3DLimit: {
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

 const Plan = mongoose.model('Plan', planSchema);
 export default Plan;