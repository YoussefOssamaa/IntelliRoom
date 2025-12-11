import express from 'express';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js'; 

const router = express.Router();


router.use('/', productRoutes);  //// =>  /ecommerce/products
router.use('/cart', cartRoutes);   //// =>  /ecommerce/cart
router.use('/order', orderRoutes);   //// =>  /ecommerce/order



export default router;