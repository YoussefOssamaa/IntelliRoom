import express from 'express';
import { putUpdateProfileController,deleteUpdateProfileController } from '../../controllers/updateProfile/updateProfileControllers.js';


const router = express.Router();


router.put('/:id' , putUpdateProfileController)
router.delete('/:id', deleteUpdateProfileController  )

export default router;
