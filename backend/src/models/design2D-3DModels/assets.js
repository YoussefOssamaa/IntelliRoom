import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    category: {
      type: String,
      enum: [
        "wall",
        "floor",
        "door",
        "window",
        "furniture",
        "light",
      ],
      required: true
    },

    modelUrl: { type: String },     // .glb / .gltf   used to load the asset into the scene
    thumbnailUrl: { type: String }, // .png to be used in the left sidebar to choose assets

    dimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      depth: { type: Number, default: 0 }
    },

    metadata: mongoose.Schema.Types.Mixed    // any additional info about the asset, can be in any json structure
  },
  { timestamps: true }
);

export default mongoose.model("Asset", assetSchema);


