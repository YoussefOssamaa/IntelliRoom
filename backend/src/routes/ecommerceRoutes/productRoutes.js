import express from 'express';
import { deleteProductsController, getProductByIdController, getProductsByCategory, postProductsController, putProductsController } from '../../controllers/ecommerce/productController.js';



const router = express.Router();


router.get('/', getProductsByCategory ) //// =>  /ecommerce/products?category=categoryId
router.get('/:id', getProductByIdController );   //// =>  /ecommerce/products/:id
router.post('/', postProductsController);   //// =>  /ecommerce/products
router.put('/:id', putProductsController);   //// =>  /ecommerce/products/:id
router.delete('/:id', deleteProductsController);   //// =>  /ecommerce/products/:id


export default router;



