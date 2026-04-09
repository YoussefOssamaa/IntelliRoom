import User from '../../models/user.js'; 

export const getShopperProfile = async (req, res) => {
    try {
        // req.userId comes from the protected middleware
        const shopper = await User.findById(req.userId).select('-password');
        
        if (!shopper) {
            return res.status(404).json({ success: false, message: "Shopper not found" });
        }
        
        // Send the profile data back to React
        res.status(200).json({ success: true, user: shopper });
    } catch (error) {
        console.error("Error fetching shopper profile:", error);
        res.status(500).json({ success: false, message: "Server error fetching profile" });
    }
};