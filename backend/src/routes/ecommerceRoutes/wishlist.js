import express from 'express';



const router = express.Router();

router.post('/', postWishlistController)
router.get('/', getWishlistController)
router.delete('/:id', DeleteFromWishlistController)


export default router;

