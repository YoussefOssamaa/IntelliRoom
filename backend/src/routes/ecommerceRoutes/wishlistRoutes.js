import express from 'express';
import protect from '../../middleware/protect.middleware.js'; 
import { getWishlist, toggleWishlistItem } from '../../controllers/ecommerce/wishlistController.js';

const router = express.Router();

// GET /api/wishlist
router.get('/', protect, getWishlist);

// POST /api/wishlist/toggle
router.post('/toggle', protect, toggleWishlistItem);

export default router;
