import express from 'express';
import {
  get3dRendersController,
  getRender3DJobStatusController,
  post3dRenderController
} from '../../controllers/render3D/3dRenderController.js';

const router = express.Router();

router.get('/', get3dRendersController);
router.get('/:jobId', getRender3DJobStatusController);

router.post('/capture', post3dRenderController);

export default router;