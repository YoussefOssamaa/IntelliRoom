import { z } from 'zod';

// Schema for creating a plan
export const createPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be a positive number or 0"),
  currency: z.string().optional(),
  fawaterkProductId: z.string().optional(),
  renderLimit: z.number().int().min(-1, "Render limit must be -1 (unlimited) or higher"),
  model3DLimit: z.number().int().min(-1, "Model 3D limit must be -1 (unlimited) or higher"),
  availableFeatures: z.array(z.string()).optional(),
  billingCycles: z.array(z.string()).optional()
});

// Schema for updating a plan (all fields become optional)
export const updatePlanSchema = createPlanSchema.partial();

// Schema for validating MongoDB Object IDs in params
export const planIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid plan ID format")
});