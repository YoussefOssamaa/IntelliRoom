import express from 'express';
import { deleteOrderController, getOrderController, postOrderController, putOrderController } from '../../controllers/ecommerce/orderController.js';



const router = express.Router();


router.get('/', getOrderController);   //// =>  /ecommerce/order
router.post('/', postOrderController );   //// =>  /ecommerce/order
router.put('/:id',putOrderController );   //// =>  /ecommerce/order/:id
router.delete('/:id', deleteOrderController );   //// =>  /ecommerce/order/:id


export default router;

