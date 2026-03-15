import express from 'express';
import { deleteProjectController, getProjectByIDController, getProjectsController, postProjectController, updateProjectController } from '../../controllers/design2D/design2D3DController.js';



const router = express.Router();


router.post('/', postProjectController );    /// for project first creation
router.get('/', getProjectsController );    ///// will be used to fetch all projects of a user, for ex: in the dashboard show all the projects' images
router.get('/:id', getProjectByIDController );   
router.put('/:id', updateProjectController );   /// for updating the project, ex: the save button
router.delete('/:id', deleteProjectController );





export default router;