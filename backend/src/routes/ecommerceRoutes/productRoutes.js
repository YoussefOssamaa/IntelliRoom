import express from 'express';
import { deleteProductsController, getProductsController, postProductsController, putProductsController } from '../../controllers/ecommerce/productController.js';



const router = express.Router();


router.get('/', getProductsController);   //// =>  /ecommerce/products
//router.get('/:id', getProductsController);   //// =>  /ecommerce/products/:id
router.post('/', postProductsController);   //// =>  /ecommerce/products
router.put('/:id', putProductsController);   //// =>  /ecommerce/products/:id
router.delete('/:id', deleteProductsController);   //// =>  /ecommerce/products/:id


export default router;