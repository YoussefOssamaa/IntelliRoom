import bcrypt from 'bcryptjs';
import Admin from '../models/admin/admin.js'; 
import User from '../models/user.js';
import mongoose from 'mongoose';

const DEFAULT_PASSWORD = 'password123'; 

export const seedAccounts = async () => {
    try {
        console.log('⏳ Starting to seed accounts...');

        const adminsData = [
            { 
                name: 'General Admin', 
                email: 'admin@system.com', 
                password: DEFAULT_PASSWORD, 
                role: 'admin' 
            },
            { 
                name: 'Super Admin', 
                email: 'super@system.com', 
                password: DEFAULT_PASSWORD, 
                role: 'superadmin' 
            }
        ];
        await Admin.create(adminsData);

        const salt = await bcrypt.genSalt(10);
        const hashedUserPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        const usersData = [
            { user_name: 'user_free_1', email: 'free1@system.com', password: hashedUserPassword, firstName: 'Ali', lastName: 'Free', plan: 'free' },
            { user_name: 'user_free_2', email: 'free2@system.com', password: hashedUserPassword, firstName: 'Mona', lastName: 'Free', plan: 'free' },
            { user_name: 'user_pro_1', email: 'pro1@system.com', password: hashedUserPassword, firstName: 'Omar', lastName: 'Pro', plan: 'pro' },
            { user_name: 'user_pro_2', email: 'pro2@system.com', password: hashedUserPassword, firstName: 'Sara', lastName: 'Pro', plan: 'pro' },
            { user_name: 'user_business_1', email: 'business1@system.com', password: hashedUserPassword, firstName: 'Tarek', lastName: 'Business', plan: 'business' }
        ];
        await User.create(usersData);

        console.log('✅ All accounts (Admins & Users) seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding accounts:', error.message);
    }
};

export const clearAccounts = async () => {
    try {
        console.log('⏳ Starting to clear seeded accounts...');

        const adminEmails = ['admin@system.com', 'super@system.com'];
        const userEmails = [
            'free1@system.com', 
            'free2@system.com', 
            'pro1@system.com', 
            'pro2@system.com', 
            'business1@system.com'
        ];

        await Admin.deleteMany({ email: { $in: adminEmails } });
        await User.deleteMany({ email: { $in: userEmails } });

        console.log('🗑️ Seeded accounts cleared successfully!');
    } catch (error) {
        console.error('❌ Error clearing accounts:', error.message);
    }
};

const runSeeder = async () => {
    try {
        await mongoose.connect('mongodb://devuser:devpass@mongo:27017/intelliroomdb?authSource=admin'); 
        console.log('✅ Connected to MongoDB');

        // await seedAccounts(); 
        await clearAccounts();
        
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        process.exit(1);
    }
};

// تشغيل السكريبت
runSeeder();
// seedAccounts();
// clearAccounts();