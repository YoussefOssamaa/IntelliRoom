import express from 'express';
import { deleteGeneratedImageController, getGeneratedImageByIDController, getGeneratedImagesController, postGeneratedImageController, putGeneratedImageController } from '../../controllers/generatedImage/generatedImageController.js';
import { requireCredits } from '../../middleware/creditMiddleware.js';

const router = express.Router();


router.post('/', requireCredits(50), postGeneratedImageController)
router.get('/', getGeneratedImagesController)   /// get all the generated images of a user to be showed in the dashboard
router.get('/:id', getGeneratedImageByIDController)
router.put('/:id', putGeneratedImageController)
router.delete('/:id', deleteGeneratedImageController ) 

export default router;
