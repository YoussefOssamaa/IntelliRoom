import express from 'express';
import { getDashboardOverview } from '../../controllers/ecommerce/AdminDashboardController.js';

import protectAdmin from '../../middleware/protectAdmin.middleware.js'; 

const router = express.Router();

// The 'protectAdmin' middleware ensures the user has a valid admin token 
// before allowing them to access the dashboard overview data.
router.get('/overview', protectAdmin, getDashboardOverview);

export default router;