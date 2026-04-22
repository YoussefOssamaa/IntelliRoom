import express from 'express';
import protect from '../../middleware/protect.middleware.js';
import render3DRouter from './render3DRouter.js';

const router = express.Router();

router.use(protect);
router.use('/', render3DRouter);

export default router;
