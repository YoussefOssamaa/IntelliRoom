import mongoose from "mongoose";

export const MODEL_CATEGORIES = [
  "bedroom",
  "living_room",
  "kitchen",
  "dining_room",
  "office",
  "bathroom",
  "outdoor",
  "hallway",
  "storage",
  "lighting",
  "not_furniture",
  "other_furniture",
];

const dimensionsSchema = new mongoose.Schema(
  {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    depth: { type: Number, default: 0 },
  },
  { _id: false },
);

const assetUrlsSchema = new mongoose.Schema(
  {
    modelUrl: { type: String, trim: true, default: "" },
    thumbnailUrl: { type: String, trim: true, default: "" },
    topViewUrl: { type: String, trim: true, default: "" },
    modelKey: { type: String, trim: true, default: "" },
    thumbnailKey: { type: String, trim: true, default: "" },
    topViewKey: { type: String, trim: true, default: "" },
  },
  { _id: false, strict: false },
);

const ownershipSchema = new mongoose.Schema(
  {
    ownerId: { type: String, default: null },
    isPublic: { type: Boolean, default: true },
  },
  { _id: false },
);

const metadataSchema = new mongoose.Schema(
  {
    dimensions: {
      type: dimensionsSchema,
      default: () => ({}),
    },
    format: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false, strict: false },
);

const threeDModelSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: MODEL_CATEGORIES,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sub_category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    assets: {
      type: assetUrlsSchema,
      required: true,
      default: () => ({}),
    },

    // Denormalized mirrors kept for controller/query convenience.
    modelUrl: { type: String, trim: true, default: "" },
    thumbnailUrl: { type: String, trim: true, default: "" },
    topViewUrl: { type: String, trim: true, default: "" },

    metadata: {
      type: metadataSchema,
      default: () => ({}),
    },
    ownership: {
      type: ownershipSchema,
      default: () => ({ isPublic: true }),
    },
    tags: {
      type: [String],
      default: [],
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    strict: false,
    collection: "three_d_models",
  },
);

threeDModelSchema.index({ category: 1, sub_category: 1, name: 1 });

const ThreeDModel =
  mongoose.models.ThreeDModel ||mongoose.model("ThreeDModel", threeDModelSchema);

export default ThreeDModel;
