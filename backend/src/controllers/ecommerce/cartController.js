import express from 'express';
import Cart from '../../models/ecommerceModels/cart.js';

const TEST_USER_ID = "64f3a5e6a3c9b7f1a1234567"; // this is a test user ID for development purposes


export const getCartController =  async (req, res) => {
  
  try {
    
          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)
          

  const cart = await Cart.findOne({user : req.user.id}).populate('items.product');
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
          
      
          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)


    const existingCart = await Cart.findOne({user : req.user.id});
    if (existingCart) {
    return res.status(400).json({ error: "Cart already exists" });
    }


    const new_cart = new Cart(
      {
        user : req.user.id,
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


          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)


    const {id} = req.params;
    const cart = await Cart.findById(id);


        if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }


        //Security check
      if (cart.user.toString() !== req.user.id   ) {
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


          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)


    const {id} = req.params;

    const cart = await Cart.findById(id);

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

        //Security check
      if (cart.user.toString() !== req.user.id   ) {
        return  res.status(403).json({ error: "Unauthorized action" });
      }
    
    await cart.deleteOne();  



    console.log(cart);
    res.status(200).json({ message: "Cart deleted successfully" });

    }catch(err){
      return res.status(500).json({ error: err.message });
    }

}