import express from 'express';
import projectRouter from './projectRouter.js';
import protect from '../../middleware/protect.middleware.js';


const router = express.Router();

router.use(protect)


router.use('/' , projectRouter);

export default router;



