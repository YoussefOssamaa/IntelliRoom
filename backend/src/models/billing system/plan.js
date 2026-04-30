import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
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
      min: 0, // السعر هيكون بالقرش (Cents) لو هتتعامل مع بيموب، يعني الـ 100 جنيه تتكتب 10000
    },
    currency: {
      type: String,
      default: "EGP",
      uppercase: true,
      trim: true,
    },
    // لو الخطة دي ليها تعريف معين على بيموب
    paymobIntegrationId: {
      type: String,
      trim: true,
    },
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
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);