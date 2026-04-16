import express from 'express';
import projectRoutes from './projectRoute.js';

const router = express.Router();


router.use('/projects' , projectRoutes);

export default router;

