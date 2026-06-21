import express from 'express';
import {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan
} from '../controllers/plan/planController.js';

// Import standard admin protection (no super-admin required)
import protectAdmin from '../middleware/protectAdmin.middleware.js';
import { validateCreatePlan, validateUpdatePlan, validatePlanId } from '../validations/plan/planValidation.middleware.js';

const router = express.Router();

// Public
router.get('/', getAllPlans);

// Admin-only (All admins can CRUD plans)
router.post('/', protectAdmin, validateCreatePlan, createPlan);
router.put('/:id', protectAdmin, validatePlanId, validateUpdatePlan, updatePlan);
router.delete('/:id', protectAdmin, validatePlanId, deletePlan);

export default router;
