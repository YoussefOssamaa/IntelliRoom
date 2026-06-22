import express from 'express';
import { createReview, getProductReviews } from '../../controllers/ecommerce/ReviewController.js';
import protect from '../../middleware/protect.middleware.js';

const router = express.Router();

// Public route: Anyone can read reviews for a product
router.get('/:productId', getProductReviews);

// Protected route: Only logged-in users can leave a review
router.post('/', protect, createReview);

export default router;