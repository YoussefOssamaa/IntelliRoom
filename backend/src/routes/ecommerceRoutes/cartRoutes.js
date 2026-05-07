import express from 'express';
import { 
    deleteCartController, 
    getCartController, 
    postCartController, 
    putCartController 
} from '../../controllers/ecommerce/cartController.js';

import protect from '../../middleware/protect.middleware.js'; 

const router = express.Router();

router.get('/', protect, getCartController);
router.post('/', protect, postCartController);
router.put('/', protect, putCartController);
router.delete('/:productId', protect, deleteCartController);

export default router;