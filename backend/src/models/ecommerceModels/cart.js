import mongoose from "mongoose";
import cartItemSchema from "./cartItem.js";

const cartSchema = new mongoose.Schema(
  {
    // 1. Optional User (For logged-in shoppers)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    
    // 2. Guest ID (For anonymous shoppers using cookies/local storage)
    guestId: {
      type: String,
      default: null
    },
    
    items: [cartItemSchema],
    
    // 3. Cart Lifecycle Tracking
    status: {
      type: String,
      enum: ['active', 'converted', 'abandoned'],
      default: 'active'
    },
    
    // 4. Auto-Deletion for Old Carts (Default: 30 Days)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
    }
  },
  { timestamps: true }
);

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Cart", cartSchema);
