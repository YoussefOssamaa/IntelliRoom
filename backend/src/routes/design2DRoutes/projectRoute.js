import express from 'express';
import { deleteProjectController, getProjectByIDController, getProjectsController, postProjectController, updateProjectController } from '../../controllers/design2D/design2DController.js';
import { getAssetsByCategoryController, getAssetsCatergoriesController } from '../../controllers/design2D/assetsController.js';
import { getFloorPlanByCategoryController, getFloorPlanCategoriesController } from '../../controllers/design2D/floorPlanController.js';



const router = express.Router();

router.get('/assets/categories', getAssetsCatergoriesController); /////Fetch all assets' Categories to be used first in the frontend to show available categories
router.get('/assets', getAssetsByCategoryController);  /// Fetch assets by category, for ex: /assets?category=furniture  or fetch all assets if no category is provided


router.get('/floorPlan/categories', getFloorPlanCategoriesController); /////Fetch all floor plan tool Categories to be used first in the frontend to show available categories
router.get('/floorPlan', getFloorPlanByCategoryController);  /// Fetch floor plan tools by category, for ex: /floorPlan?category=wall  or fetch all floor plan tools if no category is provided


router.post('/', postProjectController );
router.get('/', getProjectsController );    ///// will be used to fetch all projects of a user, for ex: in the dashboard show all the projects' images
router.get('/:id', getProjectByIDController );
router.put('/:id', updateProjectController );
router.delete('/:id', deleteProjectController );





export default router;