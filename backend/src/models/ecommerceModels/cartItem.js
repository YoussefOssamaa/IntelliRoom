import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  priceAtAdd : {
    type: Number,
    required: true,
    min: 0
  }
});

export default cartItemSchema;   ////used only by cart.js, no need to be a model itself