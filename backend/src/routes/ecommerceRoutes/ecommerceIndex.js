import express from 'express';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js'; 
import categoryRoutes from './categoryRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';

const router = express.Router();



router.use('/categories', categoryRoutes);  //// =>  /ecommerce/categories            SELECT THE CATEGORY FIRST 
router.use('/products', productRoutes);  //// =>  /ecommerce/products       The products api, can fetch all products or by id or by category 
router.use('/cart', cartRoutes);   //// =>  /ecommerce/cart
router.use('/order', orderRoutes);
router.use('/wishlist', wishlistRoutes);  //// =>  /ecommerce/wishlist

export default router;