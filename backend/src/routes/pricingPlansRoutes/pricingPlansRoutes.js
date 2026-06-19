import express from 'express';
import { 
  getPlans, 
  getPlanById, 
  createPlan, 
  updatePlan, 
  deletePlan 
} from '../../controllers/pricingPlansController/planController.js';

const router = express.Router();

// Routes for the main collection
router.route('/')
  .get(getPlans)
  .post(createPlan);

// Routes for specific items (requires an ID)
router.route('/:id')
  .get(getPlanById)
  .put(updatePlan)
  .delete(deletePlan);

export default router;