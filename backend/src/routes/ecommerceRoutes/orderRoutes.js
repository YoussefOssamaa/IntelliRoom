import express from 'express';
import {
  postOrderController,
  getUserOrdersController,
  cancelOrderController,
  getAllOrdersAdmin,
  updateOrderStatusAdmin
} from '../../controllers/ecommerce/orderController.js'; 

import protect from '../../middleware/protect.middleware.js'; // Adjust path to point to your auth file

const router = express.Router();

// ==========================================
// CUSTOMER ROUTES 
// ==========================================
router.post('/', protect, postOrderController);
router.get('/my-orders', protect, getUserOrdersController);
router.put('/:id/cancel', protect, cancelOrderController);

// ==========================================
// ADMIN ROUTES (Security Temporarily Bypassed!)
// ==========================================
// TODO: We are only using 'protect' right now so you can test the UI. 
// We MUST add a proper Admin Role check back in before launching to production!

router.get('/admin/all', protect, getAllOrdersAdmin);
router.put('/admin/:id/status', protect, updateOrderStatusAdmin);

export default router;