import 'dotenv/config';
import connectDB from './src/config/db.js';
import Plan from './src/models/billing system/plan.js';
import mongoose from 'mongoose';

const run = async () => {
    try {
        await connectDB();
        const plan = await Plan.findOne({ name: 'pro' });
        if (plan) {
            console.log(`\n=== PRO PLAN ID: ${plan._id} ===\n`);
        } else {
            console.log('\n=== PRO PLAN NOT FOUND ===\n');
        }
        console.log('To get the token, use Postman to POST to your login endpoint with email: pro1@system.com and password: password123\n');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
