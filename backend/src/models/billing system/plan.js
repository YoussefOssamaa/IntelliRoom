// /workspace/backend/src/models/billing system/plan.js

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
      min: 0, // Price in EGP (whole numbers, not cents)
    },
    currency: {
      type: String,
      default: "EGP",
      uppercase: true,
      trim: true,
    },
    // Replace Paymob field with Fawaterak if needed
    fawaterkProductId: {
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
    },
    // Optional: billing cycle configuration
    billingCycles: {
      type: [String],
      enum: ["monthly", "yearly"],
      default: ["monthly", "yearly"],
    }
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);