import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    // 1. Basic Info
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
      description: 'URL-friendly version (e.g., "living-room")'
    },
    description: {
      type: String,
      trim: true,
      maxLength: 500
    },

    // 2. Visuals & UI
    media: {
      thumbnailUrl: { 
        type: String, 
        default: "/marketplace/defaultRoomPic.jpg" 
      },
      bannerUrl: { 
        type: String,
        default: "/marketplace/defaultThumbnail.jpg" 
      }
    },

    designerAssets: {
      defaultFloorplanUrl: { type: String },
      threeDEnvironmentModel: { type: String },
      baseLightingConfig: { type: String } 
    },

    // 4. Admin Controls
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);
export default Room;