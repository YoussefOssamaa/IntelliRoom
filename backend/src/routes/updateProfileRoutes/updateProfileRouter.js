import express from 'express';
import { putUpdateProfileController,deleteUpdateProfileController } from '../../controllers/updateProfile/updateProfileControllers.js';
import protect from '../../middleware/protect.middleware.js';


const router = express.Router();

router.put('/' , protect , putUpdateProfileController)
router.delete('/', protect , deleteUpdateProfileController  )

export default router;
