import express from 'express';
import { deleteCartController, getCartController, postCartController, putCartController } from '../../controllers/ecommerce/cartController.js';


const router = express.Router();

router.get('/', getCartController);
router.post('/', postCartController);
router.put('/:id', putCartController);
router.delete('/:id', deleteCartController);

export default router;