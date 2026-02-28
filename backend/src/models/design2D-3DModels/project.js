import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,  
      required: true
    },

    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "Untitled Project"
    },

    version: {
      type: Number,
      default: 1.0
    },  ////////// This is the version of the file format, not the design itself: ex: now we have walls, doors only in thumbnail, later we may add windows to the 
        //// database , so the old version designs will be broken, unless we specify the version, so we can migrate to newer format when loading 


    /// stores the entire 2D/3D data in JSON format
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    
    coverImageUrl:{
      type: String, 
      required: false,
      default: null
    } ,

    thumbnailUrl:{
      type: String, 
      required: false,
      default: null 
    } ,
    stats: {
      layerCount: { type: Number, default: 0 },
      wallCount: { type: Number, default: 0 },
      itemCount: { type: Number, default: 0 },
      areaSize: { type: Number, default: 0 } 
    },



  },
  { timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true } }
);




      projectSchema.virtual('layers').get(function() {
      return this.data?.layers || {};  
    });

    projectSchema.virtual('layerCount').get(function() {
      return Object.keys(this.data?.layers || {}).length;
    });

    projectSchema.virtual('elementCount').get(function() {
      let count = 0;
      const layers = this.data?.layers || {};
      for (const layer of Object.values(layers)) {
        count += Object.keys(layer.vertices || {}).length;
        count += Object.keys(layer.lines || {}).length;
        count += Object.keys(layer.items || {}).length;
      }
      return count;
    });



  projectSchema.index({ owner: 1, updatedAt: -1 });  // Find user's projects by date
  projectSchema.index({ title: 'text' });             // Search by title


export default mongoose.model("Project", projectSchema);
