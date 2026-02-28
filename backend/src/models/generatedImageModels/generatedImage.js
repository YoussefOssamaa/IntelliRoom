import mongoose from "mongoose";

const generatedImageSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  inputPrompt: {
    type: String,
    default: ""
  },
  
  originalImageUrl: {
    type: String,
    required: true
  },

  referenceImageUrl: {
    type: String,
    required: true
  },

  generatedImageUrl: {
    type: String,
    required: true
  },

    isFavorite: {
    type: Boolean,
    default: false
  }


}, { timestamps: true });

const GeneratedImage = mongoose.model("GeneratedImage", generatedImageSchema);

export default GeneratedImage;