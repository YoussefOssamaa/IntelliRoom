import mongoose from "mongoose";

const floorPlanObjectSchema = new mongoose.Schema({
  name: { type: String, required: true }, 

  category: {
    type: String,
    enum: ["wall", "door", "window", "column"],
    required: true
  },

  dimensions: {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    thickness: { type: Number, default: 0 }
  },
  
  thumbnailUrl: { type: String }, 
  modelUrl: { type: String }, 
    
  constraints: {
    snapToWall: Boolean,
    requiresWall: Boolean
  },
  ////// optional reference to an Asset document for 3D representation, will be used later
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset"
  }
}, { timestamps: true });

export default mongoose.model("FloorPlanObject", floorPlanObjectSchema);
