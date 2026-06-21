import mongoose from "mongoose";
import Product from "./product.js";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    comment: {
      type: String,
      required: true,
      maxLength: 1000
    },
    // Flag to show if the user actually bought the item
    isVerifiedPurchase: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Prevent a user from leaving multiple reviews on the same product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// --- Post-Save Hook to Update Product Rating automatically ---
reviewSchema.post('save', async function() {
  const ProductModel = mongoose.model('Product');
  
  // Calculate the new average and count
  const stats = await this.constructor.aggregate([
    { $match: { product: this.product } },
    { $group: { 
        _id: '$product', 
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await ProductModel.findByIdAndUpdate(this.product, {
      'social.averageRating': Math.round(stats[0].averageRating * 10) / 10,
      'social.reviewCount': stats[0].reviewCount
    });
  }
});

export default mongoose.model("Review", reviewSchema);