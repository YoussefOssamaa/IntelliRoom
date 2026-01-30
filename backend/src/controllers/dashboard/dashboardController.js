import express from 'express';
import User from '../../models/user.js';


export const getDashboardController  = async (req, res) => {

    try {
    const userId = req.userId;
    
    if (!userId) {
        return res.status(401).json({ success: false, message: "not authenticated" });
    }

    const dashboardData = await User.findById(userId)
    .select('user_name   email   credits   plan   firstName   lastName   profile_picture_url   ecommerce_wishlist')
    .populate('ecommerce_wishlist');


    
    if (!dashboardData) {
        return res.status(404).json({message: "Dashboard data not found" });
    }

    return res.status(200).json(dashboardData);
    } catch (e) {
        console.log(e.message);
        return res.status(500).json({message: "Internal server error" });
    }

}
