import express from 'express';
import protectAdmin from '../../middleware/protectAdmin.middleware.js';

import { 
    getUsersWithSubscriptions, 
    suspendUserSubscription, 
    changeUserPlan 
} from '../../controllers/admin/DashboardController.js';

const router = express.Router();

router.use(protectAdmin);

router.get('/users', getUsersWithSubscriptions);

router.patch('/users/:userId/suspend', suspendUserSubscription);

router.patch('/users/:userId/change-plan', changeUserPlan);

export default router;