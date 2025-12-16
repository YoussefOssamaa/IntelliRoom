import express from 'express';
import { DeleteFromWishlistController, getWishlistController, postWishlistController } from '../../controllers/ecommerce/wishlistController.js';



const router = express.Router();

router.post('/', postWishlistController)
router.get('/', getWishlistController)
router.delete('/:id', DeleteFromWishlistController)


export default router;

