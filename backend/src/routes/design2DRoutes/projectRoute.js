import express from 'express';
import { deleteProjectController, getProjectByIDController, getProjectsController, postProjectController, updateProjectController } from '../../controllers/design2D/design2DController.js';
import { getAssetsByCategoryController, getAssetsCatergoriesController } from '../../controllers/design2D/assetsController.js';



const router = express.Router();

router.get('/assets/category', getAssetsCatergoriesController);
router.get('/assets', getAssetsByCategoryController);  /// can be used to fetch assets by category, for ex: /assets?category=furniture  or fetch all assets if no category is provided


router.post('/', postProjectController );
router.get('/', getProjectsController );    ///// will be used to fetch all projects of a user, for ex: in the dashboard show all the projects' images
router.get('/:id', getProjectByIDController );
router.put('/:id', updateProjectController );
router.delete('/:id', deleteProjectController );




export default router;