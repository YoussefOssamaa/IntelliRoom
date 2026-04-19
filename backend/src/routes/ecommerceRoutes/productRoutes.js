import express from 'express';
import { getProducts, getProductBySlug } from '../../controllers/ecommerce/productController.js';
import { deleteProductsController, getProductByIdController, postProductsController, putProductsController } from '../../controllers/ecommerce/productController.js';
import { getFeaturedProducts, getMatchedProducts } from '../../controllers/ecommerce/productController.js';

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products (handles filtering, sorting, etc. via query params)
// @access  Public
router.get('/', getProducts);

// @route   GET /api/products/:slug
// @desc    Get a single product by its slug (for the individual product page)
// @access  Public
router.get('/:slug', getProductBySlug);






//router.get('/', getProductsByCategory ) //// =>  /ecommerce/products?category=categoryId
router.get('/:id', getProductByIdController);   //// =>  /ecommerce/products/:id
router.post('/', postProductsController);   //// =>  /ecommerce/products
router.put('/:id', putProductsController);   //// =>  /ecommerce/products/:id
router.delete('/:id', deleteProductsController);   //// =>  /ecommerce/products/:id
router.get('/featuredProducts', getFeaturedProducts);   //// =>  /ecommerce/products/featured
router.get('/matchedProducts', getMatchedProducts)




export default router;


