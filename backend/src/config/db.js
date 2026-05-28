import mongoose from "mongoose";
import dotenv from "dotenv";




const connectDB = async () => {
  try {
      const atlasUri = String(process.env.MONGO_URI).trim();
    if (!atlasUri) {
      throw new Error("MONGO_URI is required");
    }

    await mongoose.connect(atlasUri);

    console.log("MongoDB connected successfully");

  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
