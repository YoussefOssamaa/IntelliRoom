import express from 'express';
import  protect  from '../../middleware/protect.middleware.js';
import { getMySubscription, subscribePlan, unsubscribePlan, changePlan, createFawaterkCheckout, fawaterkWebhook } from '../../controllers/subscribtion/subscribtionController.js';
const router = express.Router();

router.post('/webhook', fawaterkWebhook);

router.use(protect)

router.get('/me', getMySubscription)

router.post('/subscribe', subscribePlan)

router.post('/unsubscribe', unsubscribePlan)

router.post('/changePlan', changePlan)

router.post('/checkout', createFawaterkCheckout);

export default router;