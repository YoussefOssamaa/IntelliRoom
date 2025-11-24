import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://devuser:devpass@mongo:27017/mydb?authSource=admin");
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
