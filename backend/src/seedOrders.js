import mongoose from "mongoose";
import dotenv from "dotenv";

import Order from "./models/ecommerceModels/order.js";
import User from "./models/user.js"; 
import Product from "./models/ecommerceModels/product.js"; 

// Load environment variables (so we have access to process.env.MONGO_URI)
dotenv.config();

const seedOrders = async () => {
  try {
    // 1. Connect to MongoDB
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected Successfully!");

    // 2. Fetch existing Users and Products to link to the fake orders
    const users = await User.find({});
    const products = await Product.find({});

    if (users.length === 0 || products.length === 0) {
      console.error("❌ You need at least 1 user and 1 product in your DB to generate orders!");
      process.exit(1);
    }

    // 3. Clear existing orders (Optional: comment this out if you want to keep old ones)
    await Order.deleteMany({});
    console.log("Cleared old orders.");

    const statuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
    const paymentMethods = ["Credit Card", "PayPal", "Apple Pay", "Stripe"];

    console.log("Generating 35 Mock Orders...");

    // 4. Generate 35 Random Orders
    for (let i = 0; i < 35; i++) {
      // Pick a random user
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      // Pick 1 to 3 random products for the cart
      const numItems = Math.floor(Math.random() * 3) + 1;
      let mockItems = [];
      
      for (let j = 0; j < numItems; j++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        mockItems.push({
          product: randomProduct._id,
          quantity: Math.floor(Math.random() * 4) + 1, // 1 to 4 items
          priceAtAdd: randomProduct.price || Math.floor(Math.random() * 100) + 20, // Fallback price
        });
      }

      // Generate a random date within the last 60 days
      const randomDaysAgo = Math.floor(Math.random() * 60);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - randomDaysAgo);

      // Create the order object
      const order = new Order({
        user: randomUser._id,
        items: mockItems,
        shippingAddress: {
          street: `${Math.floor(Math.random() * 9000) + 100} Main St`,
          city: "Techville",
          zipCode: "12345",
          phone: "555-019-8372",
        },
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        orderNotes: "Leave at front door",
        taxPrice: 5.99,
        shippingPrice: 10.00,
        createdAt: pastDate, // Mocking the creation date
      });

      // We use .save() instead of insertMany so your pre('save') hook calculates the totalPrice!
      await order.save();
    }

    console.log("✅ 35 Mock Orders Successfully Injected!");
    process.exit();
  } catch (error) {
    console.error("❌ Error Seeding Data:", error);
    process.exit(1);
  }
};

seedOrders();