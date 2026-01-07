import express from 'express';
import { deletePluginController, getPluginsController, postPluginController, putPluginController } from '../../controllers/plugins/pluginController.js';

const router = express.Router();

router.get('/', getPluginsController);
router.post('/', postPluginController);
router.put('/:id', putPluginController);
router.delete('/:id', deletePluginController);

export default router;