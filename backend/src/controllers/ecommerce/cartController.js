import express from 'express';
import Cart from '../../models/ecommerceModels/cart.js'; 

// 1. GET CART (Calculates total dynamically)
export const getCartController = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
        // Instead of a 404 error, return an empty cart structure so the frontend doesn't crash
        return res.status(200).json({ items: [], total: 0 });
    }

    // Dynamically calculate the total price before sending
    let total = 0;
    cart.items.forEach(item => {
        // Assuming your product model stores price at product.pricing.currentPrice
        if (item.product && item.product.pricing) {
            total += item.product.pricing.currentPrice * item.quantity;
        }
    });

    res.status(200).json({ cart, total });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// 2. ADD TO CART (Upsert logic)
export const postCartController = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const { productId, quantity } = req.body;

    // 1. Find existing cart or create a brand new one
    let cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // 2. Check if the specific product is already in the items array
    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (existingItemIndex > -1) {
      // Product is already in the cart, just increase the quantity
      cart.items[existingItemIndex].quantity += (quantity || 1);
    } else {
      // Product is not in the cart yet, push it in!
      cart.items.push({ product: productId, quantity: quantity || 1 });
    }

    // 3. Save and populate the actual product details
    await cart.save();
    await cart.populate('items.product');
    
    res.status(200).json(cart);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// 3. UPDATE ITEM QUANTITY
export const putCartController = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    // 🚀 FIX: Destructure 'quantity' to match exactly what React is sending!
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (existingItemIndex > -1) {
        // 🚀 FIX: Use 'quantity' here instead of 'newQuantity'
        if (quantity <= 0) {
            // If quantity is 0, remove the item entirely
            cart.items.splice(existingItemIndex, 1);
        } else {
            // Otherwise, set the exact new quantity
            cart.items[existingItemIndex].quantity = quantity;
        }
        await cart.save();
        await cart.populate('items.product');
        res.status(200).json(cart);
    } else {
        res.status(404).json({ error: "Item not found in cart" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// 4. REMOVE SINGLE ITEM FROM CART
export const deleteCartController = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    // Expecting the productId in the URL parameters: /api/cart/:productId
    const { productId } = req.params; 

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    // Filter out the specific product
    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json(cart);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
