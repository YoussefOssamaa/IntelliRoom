import express from 'express';
import { protect } from '../../middleware/protect.middleware';
const router = express.Router();
import { getSubscribtion, subscribePlan, unsubscribePlan, changePlan } from '../../controllers/subscribtion/subscribtionController.js';

router.use(protect)

router.get('/me', getSubscribtion)

router.post('/subscribe', subscribePlan)

router.post('/unsubscribe', unsubscribePlan)

router.post('/changePlan', changePlan)

export default router;