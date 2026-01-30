import express from 'express';
import { getDashboardController } from '../../controllers/dashboard/dashboardController.js';
import protect from '../../middleware/protect.middleware.js';


const router = express.Router();


router.get('/', protect, getDashboardController) 


export default router;