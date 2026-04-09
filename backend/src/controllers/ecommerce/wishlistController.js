import express from 'express';
import User from '../../models/user.js';


export const getWishlistController = async (req, res) => {

  try {
    const user_id = req.userId;

    const user = await User.findById(user_id).populate('ecommerce_wishlist');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.ecommerce_wishlist);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

}


export const postWishlistController = async (req, res) => {

  try {
    const user_id = req.userId;


    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const productIdToAdd = req.body.productId;

    if (user.ecommerce_wishlist.includes(productIdToAdd)) {
      return res.status(400).json({ error: "Product already in wishlist" });
    }

    user.ecommerce_wishlist.push(productIdToAdd);
    await user.save();

    await user.populate('ecommerce_wishlist');

    res.status(201).json(user.ecommerce_wishlist);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

}

export const DeleteFromWishlistController = async (req, res) => {

  try {
    const user_id = req.userId;


    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      user_id,
      { $pull: { ecommerce_wishlist: id } },
      { new: true }
    ).populate('ecommerce_wishlist');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.ecommerce_wishlist);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

}