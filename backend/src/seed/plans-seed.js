import mongoose from "mongoose";
import Plan from "../models/billing system/plan.js";
import connectDB from "../config/db.js";

import dotenv from "dotenv"; // don't understand why needed ask 3m badr
dotenv.config();

export const seedPlans = async () => {
  try {
    await connectDB();
    await Plan.insertMany([
      {
        name: "free",
        price: 0,
        renderLimit: 5,
        model3DLimit: 5,
        availableFeatures: ["basic"],
      },
      {
        name: "pro",
        price: 29,
        renderLimit: 25,
        model3DLimit: 25,
        availableFeatures: ["hd", "priority","no watermark"],
      },
      {
        name: "enterprise",
        price: 99,
        renderLimit: 1000,
        model3DLimit: 1000,
        availableFeatures: ["hd", "priority", "custom", "no watermark"],
      },
    ]);

    console.log("Plans seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

seedPlans();