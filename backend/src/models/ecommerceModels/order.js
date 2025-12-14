import mongoose from "mongoose";
import orderItemSchema from "./orderItem.js";



export const calculateTotalPrice = (items)=>{
    let total = 0;
    for (let i=0; i<items.length; i++){ 
        total += items[i].priceAtAdd * items[i].quantity;
     }
   return total;
};




const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    items: [orderItemSchema],

    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending"
    },

    isPaid: {
      type: Boolean,
      default: false
    },

    paidAt: Date
  },
  { timestamps: true }
);


//////calculate total price before saving, everytime a cart is created or updated
orderSchema.pre('save' , function() {

    this.totalPrice = calculateTotalPrice (this.items);
})



export default mongoose.model("Order", orderSchema);
