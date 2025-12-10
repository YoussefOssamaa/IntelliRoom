import express from 'express';
import { getOrderController } from '../../controllers/ecommerce/orderController.js';



const router = express.Router();


router.get('/', getOrderController);   //// =>  /ecommerce/order



export default router;

