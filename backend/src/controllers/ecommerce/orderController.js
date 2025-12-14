import express from 'express';
import Order from '../../models/ecommerceModels/order.js';
import Cart from '../../models/ecommerceModels/cart.js';
//import calculateTotalPrice from '../../models/ecommerceModels/or.js';

const TEST_USER_ID = "64f3a5e6a3c9b7f1a1234567"; // this is a test user ID for development purposes

export const getOrderController =  async (req, res) => {
  try{
    
          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)
          

      const order = await Order.find({ user: req.user.id }).populate('items.product');
      if (!order || order.length === 0) {
          return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json(order);


  }catch(err){
    return res.status(500).json({ error: err.message });}
}




export const postOrderController =  async (req, res) => {

    try{
          
      
          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment) 


    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
    }  

    const new_order = new Order(
      {
        user : req.user.id,
        items : cart.items ,
        totalPrice : cart.totalPrice,
        status : 'pending'
      }
    );
    await new_order.save();
    await new_order.populate('items.product');
    console.log(new_order);


    cart.items = [];
    await cart.save();

    res.status(201).json(new_order);

    }catch(err){
      return res.status(500).json({ error: err.message });
    }
}


export const putOrderController =  async (req, res) => {

    try{    

          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment) 

       

      const {id} = req.params;
      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

       //Security check
      if (order.user.toString() !== req.user.id   ) {
        return  res.status(403).json({ error: "Unauthorized action" });
      }

      order.items = req.body.items || order.items;

      await order.save();
      await order.populate('items.product');
      

      console.log(order);
      res.status(200).json(order);
      
    }catch(err){
      return res.status(500).json({ error: err.message });
    }

}



export const deleteOrderController =  async (req, res) => {

  try{
    
          req.user = {}; ////////////////to be removed in production (test user assignment)
          req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)
          

    const {id} = req.params;
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Security check
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized action" });
    }
    await order.deleteOne();
    console.log(order);
    return res.status(200).json({ message: "Order deleted successfully" });

  }
  catch (err){
    return res.status(500).json({ error: err.message });
  }

} 


