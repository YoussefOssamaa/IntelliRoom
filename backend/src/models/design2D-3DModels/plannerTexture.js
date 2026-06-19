import mongoose from "mongoose";

export const TEXTURE_PLACEMENTS = ["wall", "floor", "both"];
export const PLANNER_TEXTURE_COLLECTION = "planner_textures";
export const TEXTURE_MAP_KEYS = [
  "Color",
  "NormalGL",
  "Roughness",
];

const textureMapsSchemaDefinition = TEXTURE_MAP_KEYS.reduce(
  (schemaDefinition, mapKey) => {
    schemaDefinition[mapKey] = {
      type: String,
      trim: true,
      default: "",
    };
    return schemaDefinition;
  },
  {},
);


const plannerTextureSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      default: "other",
      index: true,
    },
    placement: {
      type: String,
      enum: TEXTURE_PLACEMENTS,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    source: { type: String, trim: true, default: "" },
    license: { type: String, trim: true, default: "" },
    resolution: { type: String, trim: true, default: ""     },
    maps: {
      type: new mongoose.Schema(textureMapsSchemaDefinition, {
        _id: false,
      }),
      required: true,
    },
  },
  {
    collection: PLANNER_TEXTURE_COLLECTION,
  },
);

plannerTextureSchema.index({ placement: 1, category: 1, displayName: 1 });

const PlannerTexture =
  mongoose.models.PlannerTexture ||
  mongoose.model("PlannerTexture", plannerTextureSchema);

export default PlannerTexture;
