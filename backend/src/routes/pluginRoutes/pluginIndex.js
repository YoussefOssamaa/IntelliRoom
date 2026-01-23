import express from 'express';
import { deletePluginController, getPluginByIdController, getPluginsController, postPluginController, putPluginController } from '../../controllers/plugins/pluginController.js';

const router = express.Router();


router.get('/', getPluginsController);
router.get('/:id', getPluginByIdController);
router.post('/', postPluginController);
router.put('/:id', putPluginController);
router.delete('/:id', deletePluginController);