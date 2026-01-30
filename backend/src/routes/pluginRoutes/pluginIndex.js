import express from 'express';
import { deletePluginController, getPluginByIdController, getPluginsController, postPluginController, putPluginController } from '../../controllers/plugins/pluginController.js';
import project from '../../models/design2D-3DModels/project.js';

const router = express.Router();

router.get('/' ,  getPluginsController);
router.get('/:id' , getPluginByIdController);
router.post('/' ,project, postPluginController);
router.put('/:id' ,project , putPluginController);
router.delete('/:id' ,project , deletePluginController);

export default router;