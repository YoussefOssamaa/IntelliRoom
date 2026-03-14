import express from 'express';
import { deleteProjectController, getProjectByIDController, getProjectsController, postProjectController, updateProjectController } from '../../controllers/design2D/design2D3DController.js';



const router = express.Router();


router.post('/', postProjectController );
router.get('/', getProjectsController );    ///// will be used to fetch all projects of a user, for ex: in the dashboard show all the projects' images
router.get('/:id', getProjectByIDController );
router.put('/:id', updateProjectController );
router.delete('/:id', deleteProjectController );





export default router;