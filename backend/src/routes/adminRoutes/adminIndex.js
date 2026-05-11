import express from 'express';
import { 
    getMe, 
    signIn, 
    addAdmin, 
    logout, 
    Refresh,
    getAllAdmins, 
    unlockAdmin,
    getAdminLogs 
} from '../../controllers/admin/adminController.js';

import protectAdmin from '../../middleware/protectAdmin.middleware.js';
import { isSuperAdmin } from '../../middleware/isSuperAdmin.middleware.js';

const router = express.Router();

router.post('/signin', signIn);
router.post('/refresh', Refresh);

router.use(protectAdmin); 

router.get('/me', getMe);
router.post('/logout', logout);

router.post('/addAdmin', isSuperAdmin, addAdmin); 

router.get('/all', isSuperAdmin, getAllAdmins);

router.patch('/unlock/:id', isSuperAdmin, unlockAdmin); 


router.get('/logs', isSuperAdmin, getAdminLogs); 

export default router;