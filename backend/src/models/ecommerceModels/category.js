import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
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
      required: true, // Added required! Slugs are mandatory for routing.
      description: 'URL-friendly version of the category name (e.g., "mobile-phones")'
    },
    description: {
      type: String,
      trim: true,
      maxLength: 500 // Great for rendering a small header on the category page
    },
    image: { 
        type: String, 
        default: "https://via.placeholder.com/600x400?text=No+Category+Image" 
    },

    // 2. Hierarchy (The Magic Trick)
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category', // It references ITSELF! 
      default: null    // If null, it is a "Top Level" category (like "Furniture")
    },

    // 3. Visuals
    media: {
      thumbnailUrl: { type: String }, // For a small icon in the sidebar
      bannerUrl: { type: String }     // For the top of the category page
    },

    // 4. Admin Controls
    isActive: {
      type: Boolean,
      default: true // Admins can toggle this to false to hide it from the storefront
    }
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;