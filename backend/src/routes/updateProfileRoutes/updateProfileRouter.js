import express from 'express';
import { putUpdateProfileController } from '../../controllers/updateProfile/updateProfileControllers.js';


const router = express.Router();


router.put('/:id' , putUpdateProfileController)
//router.delete('/:id', deleteUpdateProfileController  )

export default router;
