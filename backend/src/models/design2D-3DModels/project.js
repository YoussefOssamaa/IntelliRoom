import mongoose from "mongoose";
import userSchema from "../user.js";

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      default: "Untitled Project"
    },

    version: {
      type: Number,
      default: 1.0
    },  ////////// This is the version of the file format, not the design itself: ex: now we have walls, doors only in thumbnail, later we may add windows to the 
        //// database , so the old version designs will be broken, unless we specify the version, so we can migrate to newer format when loading 

    sceneData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },      /// stores the entire 2D/3D scene data in JSON format

    coverImageUrl: String,

    thumbnailUrl: String,

    area: Number 
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
