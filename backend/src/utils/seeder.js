import bcrypt from "bcryptjs";
import Admin from "../models/admin/admin.js";
import mongoose from "mongoose";
import User from "../models/user.js";
import Subscription from "../models/billing system/Subscription.js";
import Plan from "../models/billing system/plan.js";
import Usage from "../models/billing system/usage.js";
import dotenv from "dotenv";

const DEFAULT_PASSWORD = "password123";
dotenv.config();

export const seedAccounts = async () => {
  try {
    console.log("⏳ Starting to seed accounts...");
    // Connect to DB if not already connected (useful if running standalone)
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI);
    }

    const adminsData = [
      {
        name: "General Admin",
        email: "admin@system.com",
        password: DEFAULT_PASSWORD,
        role: "admin",
      },
      {
        name: "Super Admin",
        email: "super@system.com",
        password: DEFAULT_PASSWORD,
        role: "superadmin",
      },
    ];
    await Admin.create(adminsData);

    console.log(await Admin.find({}));

    const salt = await bcrypt.genSalt(10);
    const hashedUserPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    const usersData = [
      {
        user_name: "user_free_1",
        email: "free1@system.com",
        password: hashedUserPassword,
        firstName: "Ali",
        lastName: "Free",
        plan: "free",
      },
      {
        user_name: "user_free_2",
        email: "free2@system.com",
        password: hashedUserPassword,
        firstName: "Mona",
        lastName: "Free",
        plan: "free",
      },
      {
        user_name: "user_pro_1",
        email: "pro1@system.com",
        password: hashedUserPassword,
        firstName: "Omar",
        lastName: "Pro",
        plan: "pro",
      },
      {
        user_name: "user_pro_2",
        email: "pro2@system.com",
        password: hashedUserPassword,
        firstName: "Sara",
        lastName: "Pro",
        plan: "pro",
      },
      {
        user_name: "user_enterprise_1",
        email: "enterprise1@system.com",
        password: hashedUserPassword,
        firstName: "Tarek",
        lastName: "Enterprise",
        plan: "enterprise",
      },
    ];
    await User.create(usersData);

    console.log("✅ All accounts (Admins & Users) seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding accounts:", error.message);
  }
};

export const assignFreePlanToUsers = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI);
    }
    // 1. Find the Free Plan (Assuming price is 0)
    const freePlan = await Plan.findOne({ price: 0 });
    if (!freePlan) {
      console.log("No free plan found in the database. Please create one first.");
      return;
    }

    // 2. Find all non-admin users
    const users = await User.find({ role: { $ne: 'admin' } });
    let count = 0;

    for (const user of users) {
      // 3. Check if user already has an active subscription
      const existingSub = await Subscription.findOne({
        userId: user._id,
        status: { $in: ['active', 'trial'] }
      });

      // 4. If no active subscription, give them the free plan
      if (!existingSub) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month cycle

        // We can reuse the existing `subscribePlan` logic roughly here:
        const newSubscription = await Subscription.create({ userId: user._id, planId: freePlan._id, status: 'active', billingCycle: 'monthly', startDate, endDate, renewalDate: endDate });
        await Usage.create({ userId: user._id, subscriptionId: newSubscription._id, remainingRenders: freePlan.renderLimit, periodStart: startDate, periodEnd: endDate });
        await User.findByIdAndUpdate(user._id, { plan: freePlan.name });

        count++;
      }
    }
    console.log(`✅ Successfully assigned the free plan to ${count} users.`);
  } catch (error) {
    console.error("❌ Error assigning free plans:", error);
  }
};

export const clearAccounts = async () => {
  try {
    console.log("⏳ Starting to clear seeded accounts...");

    const adminEmails = ["admin@system.com", "super@system.com"];
    const userEmails = [
      "free1@system.com",
      "free2@system.com",
      "pro1@system.com",
      "pro2@system.com",
      "enterprise1@system.com",
    ];
    console.log(await Admin.find({}));
    await Admin.deleteMany({ email: { $in: adminEmails } });
    await User.deleteMany({ email: { $in: userEmails } });

    console.log("🗑️ Seeded accounts cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing accounts:", error.message);
  }
};

const fetchAdmins = async ()=>{
    console.log(await Admin.find());
}

const runSeeder = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://admin:b97gemodlECs50zC@cluster0.2aewhnb.mongodb.net/?appName=Cluster0",
    );
    console.log("✅ Connected to MongoDB");

    // await seedAccounts();
    // await assignFreePlanToUsers();
    // await clearAccounts();
    // await fetchAdmins();
    
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  }
};

// runSeeder();
