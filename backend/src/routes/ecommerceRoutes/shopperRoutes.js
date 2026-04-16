import express from 'express';
import protect from '../../middleware/protect.middleware.js';
import { getShopperProfile } from '../../controllers/ecommerce/shopperController.js'; 

const router = express.Router();

// The secure route: GET /api/shopper/me
router.get('/me', protect, getShopperProfile);

export default router;