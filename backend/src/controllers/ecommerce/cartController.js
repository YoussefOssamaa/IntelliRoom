import express from 'express';
import Cart from '../../models/ecommerceModels/cart.js';



export const getCartController =  async (req, res) => {
  
  try {
    

        const userId = req.userId;
        /// authentication check
        if (!userId) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }

  const cart = await Cart.findOne({user : userId}).populate('items.product');
  if (!cart){
    return res.status(404).json({ message: 'Cart not found' });
  }
  res.status(200).json(cart);
  } catch(err){ 
    return res.status(500).json({ error: err.message });
  }
}



export const postCartController =  async (req, res) => {

    try{
          
        const userId = req.userId;
        /// authentication check
        if (!userId) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }

    const existingCart = await Cart.findOne({user : userId});
    if (existingCart) {
    return res.status(400).json({ error: "Cart already exists" });
    }


    const new_cart = new Cart(
      {
        user : userId,
        items : req.body.items || []
      }
    );
    await new_cart.save();
    await new_cart.populate('items.product');
    console.log(new_cart);
    res.status(201).json(new_cart);

    }catch(err){
      return res.status(500).json({ error: err.message });
    }
}


export const putCartController =  async (req, res) => {

    try{


        const userId = req.userId;
        /// authentication check
        if (!userId) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }

    const {id} = req.params;
    const cart = await Cart.findById(id);


        if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }


        //authorization check
      if (cart.user.toString() !== userId  ) {
        return  res.status(403).json({ error: "Unauthorized action" });
      }

      cart.items = req.body.items || cart.items ;
      await cart.save();
      await cart.populate('items.product');
        

    console.log(cart);
    res.status(200).json(cart);

    }catch(err){
      return res.status(500).json({ error: err.message });
    }

}



export const deleteCartController =  async (req, res) => {

  try{


        const userId = req.userId;
        /// authentication check
        if (!userId) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }

    const {id} = req.params;

    const cart = await Cart.findById(id);

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

        //Security check
      if (cart.user.toString() !== userId) {
        return  res.status(403).json({ error: "Unauthorized action" });
      }
    
    await cart.deleteOne();  



    console.log(cart);
    res.status(200).json({ message: "Cart deleted successfully" });

    }catch(err){
      return res.status(500).json({ error: err.message });
    }

}