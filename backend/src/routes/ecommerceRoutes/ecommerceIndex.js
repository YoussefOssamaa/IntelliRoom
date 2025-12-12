import express from 'express';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js'; 
import categoryRoutes from './categoryRoutes.js';

const router = express.Router();



router.use('/categories', categoryRoutes);  //// =>  /ecommerce/categories            SELECT THE CATEGORY FIRST 
router.use('/products', productRoutes);  //// =>  /ecommerce/products       SHOW ALL PRODUCTS WITHOUT SELECTING CATEGORY
router.use('/cart', cartRoutes);   //// =>  /ecommerce/cart
router.use('/order', orderRoutes);

export default router;