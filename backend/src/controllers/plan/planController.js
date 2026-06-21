import Plan from '../../models/billing system/plan.js';

// Public - get all plans
export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({}).sort({ price: 1 });
    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('getAllPlans error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin - create a new plan
export const createPlan = async (req, res) => {
  try {
    const {
      name,
      price,
      currency,
      fawaterkProductId,
      renderLimit,
      model3DLimit,
      availableFeatures,
      billingCycles,
    } = req.body;

    if (!name || price == null || renderLimit == null || model3DLimit == null) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required plan fields' });
    }

    const existing = await Plan.findOne({ name });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Plan with this name already exists' });
    }

    const plan = await Plan.create({
      name,
      price,
      currency,
      fawaterkProductId,
      renderLimit,
      model3DLimit,
      availableFeatures: availableFeatures || [],
      billingCycles: billingCycles || ["monthly", "yearly"],
    });

    return res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('createPlan error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin - update plan by ID
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    Object.assign(plan, updates);
    await plan.save();

    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error('updatePlan error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin - delete (or disable) plan by ID
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // For now perform a hard delete. If soft-delete required later, add `isActive` field.
    await Plan.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    console.error('deletePlan error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
