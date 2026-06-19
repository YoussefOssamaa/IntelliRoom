import express from 'express';
import projectRouter from './projectRouter.js';
import protect from '../../middleware/protect.middleware.js';
import {
  getAssetsByCategoryController,
  getAssetsCatergoriesController,
  getPlannerTextureCategoriesController,
  getPlannerTexturesController,
} from '../../controllers/design2D-3D/assetsController.js';


const router = express.Router();

router.get('/assets/categories', getAssetsCatergoriesController);
router.get('/assets', getAssetsByCategoryController);
router.get('/textures/categories', getPlannerTextureCategoriesController);
router.get('/textures', getPlannerTexturesController);

router.use(protect)


router.use('/' , projectRouter);

export default router;



