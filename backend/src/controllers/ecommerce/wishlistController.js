import User from '../../models/user.js';

// 1. Get the populated wishlist
export const getWishlist = async (req, res) => {
    try {
        // Find the user and populate the products in the wishlist array
        const user = await User.findById(req.userId).populate('ecommerce_wishlist');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Send the populated array back to React
        res.status(200).json({ success: true, wishlist: user.ecommerce_wishlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Add or Remove an item from the wishlist
export const toggleWishlistItem = async (req, res) => {
    try {
        const { productId } = req.body;
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if the product is already in the array
        const isFavorite = user.ecommerce_wishlist.includes(productId);

        if (isFavorite) {
            // If it's there, remove it
            user.ecommerce_wishlist = user.ecommerce_wishlist.filter(id => id.toString() !== productId);
        } else {
            // If it's not there, add it
            user.ecommerce_wishlist.push(productId);
        }

        await user.save();
        res.status(200).json({ success: true, message: 'Wishlist updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};