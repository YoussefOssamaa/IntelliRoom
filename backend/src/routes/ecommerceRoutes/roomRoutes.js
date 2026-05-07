import express from 'express';
import {
    getRoomsController,
    getRoomBySlugController,
    postRoomController,
    putRoomController,
    deleteRoomController,
    getRoomProductsController,
    getRoomByIdController
} from '../../controllers/ecommerce/roomController.js';

const router = express.Router();

router.get('/', getRoomsController);
router.post('/', postRoomController);
router.get('/:slug', getRoomBySlugController);
router.get('/:slug/products', getRoomProductsController);
router.put('/:id', putRoomController);
router.delete('/:id', deleteRoomController);
router.get('/admin/:id', getRoomByIdController);
export default router;