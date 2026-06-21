import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  monthlyPrice: { 
    type: Number, 
    required: true 
  },
  annualPrice: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  features: [{ 
    type: String 
  }],
  highlighted: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true,
  collection: 'pricingplans'
});

export default mongoose.model('PricingPlan', planSchema);