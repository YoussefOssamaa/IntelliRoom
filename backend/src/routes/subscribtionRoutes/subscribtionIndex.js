import express from 'express';
import { protect } from '../../middleware/protect.middleware';
import { getSubscribtion, subscribePlan, unsubscribePlan, changePlan, createPaymobCheckout, paymobWebhook } from '../../controllers/subscribtion/subscribtionController.js';

const router = express.Router();

router.post('/webhook', paymobWebhook);

router.use(protect)

router.get('/me', getSubscribtion)

router.post('/subscribe', subscribePlan)

router.post('/unsubscribe', unsubscribePlan)

router.post('/changePlan', changePlan)

router.post('/checkout', createPaymobCheckout);

export default router;