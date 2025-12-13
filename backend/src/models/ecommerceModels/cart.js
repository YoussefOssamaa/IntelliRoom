import mongoose from "mongoose";
import cartItemSchema from "./cartItem.js";




const calculateTotalPrice = (items)=>{
    let total = 0;
    for (let i=0; i<items.length; i++){ 
        total += items[i].priceAtAdd * items[i].quantity;
     }
   return total;
};



const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
      min: 0
    } 
  },
  { timestamps: true }
);


//////calculate total price before saving, everytime a cart is created or updated
cartSchema.pre ('save' , function(next) {

    this.totalPrice = calculateTotalPrice (this.items);
    next();
})


export default mongoose.model("Cart", cartSchema);



