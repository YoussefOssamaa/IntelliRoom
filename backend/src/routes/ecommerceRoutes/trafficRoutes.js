import express from 'express';
import { startSession, updateSessionPing } from '../../controllers/ecommerce/TrafficController.js';

const router = express.Router();

// These need to be public so anyone visiting the site can be tracked
router.post('/start', startSession);
router.put('/ping', updateSessionPing);

export default router;