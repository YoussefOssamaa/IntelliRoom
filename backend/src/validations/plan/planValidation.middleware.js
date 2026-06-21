import { createPlanSchema, updatePlanSchema, planIdSchema } from './plan.validator.js';

export const validateCreatePlan = (req, res, next) => {
  const validation = createPlanSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ 
        success: false, 
        message: "Invalid plan data", 
        errors: validation.error.format() 
    });
  }
  req.body = validation.data; // Replace body with sanitized data
  next();
};

export const validateUpdatePlan = (req, res, next) => {
  const validation = updatePlanSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: "Invalid update data", errors: validation.error.format() });
  }
  req.body = validation.data;
  next();
};

export const validatePlanId = (req, res, next) => {
  const validation = planIdSchema.safeParse(req.params);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: "Invalid plan ID", errors: validation.error.format() });
  }
  next();
};