import express from 'express';
import { deleteCategoryController, getCategoryController, postCategoryController, putCategoryController} from '../../controllers/ecommerce/categoryController.js';
import productRoutes from './productRoutes.js';

const router = express.Router();


router.get('/', getCategoryController )
router.post('/', postCategoryController )
router.put('/:id', putCategoryController )
router.delete('/:id', deleteCategoryController )

router.use('/:categoryId/products', productRoutes); //// =>  /ecommerce/categories/:categoryId/products)


export default router;