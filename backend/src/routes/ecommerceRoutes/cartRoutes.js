import express from 'express';
import { getCartController } from '../../controllers/ecommerce/cartController.js';


const router = express.Router();

router.get('/', getCartController);

export default router;