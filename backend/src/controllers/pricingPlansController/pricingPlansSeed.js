// seed.js
import mongoose from 'mongoose';
import pricingPlan from '../../models/pricingPlansModel/pricingPlansModel.js';

const MONGO_URI = 'mongodb+srv://admin:b97gemodlECs50zC@cluster0.2aewhnb.mongodb.net/?appName=Cluster0';

const initialPlans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for getting started',
    features: ['20 designs per month', 'Standard resolution (FHD)', 'Basic style library', 'Community gallery access', 'Earn credits through voting'],
    highlighted: false
  },
  {
    name: 'Pro',
    monthlyPrice: 29,
    annualPrice: 290,
    description: 'For professional creators',
    features: ['Unlimited designs', 'Unlimited downloads', 'High resolution (4K)', 'Full style library + marketplace', 'Advanced features (masking, batch)', 'Priority processing', 'Style mixing', 'Priority support'],
    highlighted: true
  },
  {
    name: 'Business',
    monthlyPrice: 99,
    annualPrice: 990,
    description: 'For teams and enterprises',
    features: ['Everything in Pro', 'API access', 'Team collaboration', 'White-label options', 'Custom integrations', 'Dedicated support', 'Custom training', 'SLA guarantee'],
    highlighted: false
  }
];

const seedDatabase = async () => {
  try {
    // 1. Connect to the database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    // 2. Clear out any old data so we don't create duplicates
    await pricingPlan.deleteMany();
    console.log('  Cleared old plans from the database.');

    // 3. Insert our array of plans
    await pricingPlan.insertMany(initialPlans);
    console.log(' Database seeded successfully with new plans!');

    // 4. Disconnect from the database
    mongoose.connection.close();
    process.exit(0); // Exit the script completely
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the function
seedDatabase();