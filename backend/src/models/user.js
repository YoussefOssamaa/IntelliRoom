import mongoose, { Schema, model } from 'mongoose'


const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },  
  user_name: { type: String, required: true, unique: true , maxLength: 30 },
  email: { type: String, required: true, unique: true },
  pass_hash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  bio: { type: String, default: "" , maxLength: 500 },
  profile_picture_url: { type: String, default: "" },
  credits: { type: Number, default: 0 },
  plan: { type: String, enum: ['free', 'monthly', 'yearly'], default: 'free' },
  is_first_time: { type: Boolean, default: true },
  ecommerce_wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }
  ]

});

const User = mongoose.model("User", userSchema);

export default User;