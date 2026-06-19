import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./../models/ecommerceModels/product.js";

dotenv.config({ path: "../../.env" });

const MONGO_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_DB}`;

async function run() {
  await mongoose.connect(MONGO_URI);
  try {
    const res = await Product.insertMany([{
      sku: "TEST-SKU",
      name: "Test",
      slug: "test-slug",
      shortDescription: "Short",
      longDescription: "Long",
      brand: "Brand",
      pricing: { originalPrice: 10, currentPrice: 10, costPerItem: 5 },
      categorization: { primary: null }
    }], { ordered: false });
    console.log("Success", res);
  } catch (err) {
    console.error("Error inserting:", err);
  }
  mongoose.disconnect();
}
run();
