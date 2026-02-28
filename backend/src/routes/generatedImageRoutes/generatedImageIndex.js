import express from 'express';
import generatedImagesRouter from './generatedImageRouter.js';
import protect from '../../middleware/protect.middleware.js';


const router = express.Router();

router.use(protect);
router.use('/', generatedImagesRouter)

export default router;