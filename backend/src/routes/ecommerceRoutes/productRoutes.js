// export default router;
import express from 'express';
import { getProducts, getProductBySlug, getUniqueRooms, createProduct, getProductFormOptions, updateProduct, deleteProduct } from '../../controllers/ecommerce/productController.js';

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products (handles filtering, sorting, etc. via query params)
// @access  Public
router.get('/', getProducts);
router.post('/', createProduct);
router.get('/form-options', getProductFormOptions);
router.get('/rooms/unique', getUniqueRooms);
router.get('/:slug', getProductBySlug);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;


