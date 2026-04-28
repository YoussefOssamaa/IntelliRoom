import express, { Router } from 'express';
import { createProduct, deleteProduct, getProductById, getProducts, updateProduct } from '../../controllers/product/productController.js';

const router = express.Router();

import {protectAdmin} from '../../middleware/protectAdmin.middleware.js'

Router.use(protectAdmin)

router.get('/' , getProducts)

router.get('/:id' , getProductById)

router.post('/' , createProduct)

router.put('/:id' , updateProduct)

router.delete('/:id' , deleteProduct)

export default router;