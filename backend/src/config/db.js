import mongoose from "mongoose";




const connectDB = async () => {
  try {
    const MONGO_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_DB}`;
    console.log("MONGO_URI:", MONGO_URI);
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected successfully");

  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;