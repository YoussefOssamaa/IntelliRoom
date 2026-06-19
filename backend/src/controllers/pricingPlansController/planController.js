import Plan from '../../models/pricingPlansModel/pricingPlansModel.js';

// @desc    Get all pricing plans
// @route   GET /api/plans
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: "Server Error: Could not fetch plans", error: error.message });
  }
};

// @desc    Get a single pricing plan by ID
// @route   GET /api/plans/:id
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ message: "Server Error: Could not fetch the plan", error: error.message });
  }
};

// @desc    Create a new pricing plan
// @route   POST /api/plans
export const createPlan = async (req, res) => {
  try {
    // req.body contains the JSON data sent from the client
    const newPlan = await Plan.create(req.body);
    
    // 201 means "Created"
    res.status(201).json(newPlan);
  } catch (error) {
    // 400 means "Bad Request" (e.g., missing required fields like 'name' or 'price')
    res.status(400).json({ message: "Failed to create plan. Check your data.", error: error.message });
  }
};

// @desc    Update an existing pricing plan
// @route   PUT /api/plans/:id
export const updatePlan = async (req, res) => {
  try {
    const updatedPlan = await Plan.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { 
        new: true, // Returns the updated document instead of the old one
        runValidators: true // Ensures the updated data still follows your Mongoose schema rules
      }
    );

    if (!updatedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.status(200).json(updatedPlan);
  } catch (error) {
    res.status(400).json({ message: "Failed to update plan", error: error.message });
  }
};

// @desc    Delete a pricing plan
// @route   DELETE /api/plans/:id
export const deletePlan = async (req, res) => {
  try {
    const deletedPlan = await Plan.findByIdAndDelete(req.params.id);

    if (!deletedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.status(200).json({ message: "Plan successfully deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Server Error: Could not delete plan", error: error.message });
  }
};