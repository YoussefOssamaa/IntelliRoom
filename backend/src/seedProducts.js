import mongoose from "mongoose";
import dotenv from "dotenv";

import Category from "./models/ecommerceModels/category.js";
import Room from "./models/ecommerceModels/room.js";
import Product from "./models/ecommerceModels/product.js";

dotenv.config();

// --- 1. RAW DATA DICTIONARIES ---
const roomsData = [
  { name: "Living Room", slug: "living-room", description: "The heart of the home, designed for comfort and gathering." },
  { name: "Bedroom", slug: "bedroom", description: "Your personal sanctuary for rest and relaxation." },
  { name: "Dining Room", slug: "dining-room", description: "Where meals and memories are shared." },
  { name: "Home Office", slug: "home-office", description: "Create, focus, and work in style." },
  { name: "Kitchen", slug: "kitchen", description: "Culinary inspiration starts with beautiful design." },
  { name: "Bathroom", slug: "bathroom", description: "Refresh and rejuvenate in a spa-like space." },
  { name: "Outdoor & Patio", slug: "outdoor-patio", description: "Extend your living space into the fresh air." }
];

const categoryHierarchy = {
  "Seating": ["Sofas & Sectionals", "Lounge & Accent Chairs", "Dining Chairs", "Bar Stools"],
  "Tables & Desks": ["Coffee Tables", "Side & End Tables", "Dining Tables", "Desks"],
  "Storage & Cabinetry": ["Bookshelves & Shelving", "Sideboards & Credenzas", "Dressers & Chests", "TV Stands & Media Consoles"],
  "Beds & Bedroom": ["Bed Frames", "Nightstands"],
  "Lighting": ["Ceiling & Pendant Lights", "Floor Lamps", "Table Lamps", "Wall Sconces"],
  "Rugs & Decor": ["Area Rugs", "Mirrors", "Wall Art"]
};

const brands = ["Nordic Home", "Lumina", "Haven & Co.", "Modus", "Artisan Wood", "Aura Design"];
const materials = ["Oak", "Walnut", "Velvet", "Linen", "Matte Steel", "Brass", "Glass", "Ceramic"];
const colors = ["Charcoal", "Cream", "Navy", "Terracotta", "Sage Green", "Warm Oak", "Matte Black", "Brushed Gold"];

// --- 2. HELPER FUNCTIONS ---
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const generateSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// --- 3. MAIN SEED FUNCTION ---
const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/your_ecommerce_db");
    console.log("🟢 Connected to MongoDB");

    await Room.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log("🧹 Cleared existing database records");

    // --- A. SEED ROOMS ---
    const insertedRooms = [];
    for (const r of roomsData) {
      const room = await Room.create({
        ...r,
        media: {
          // 🚀 STATIC LOCAL PATHS FOR ROOMS
          thumbnailUrl: "/images/default-room-thumb.jpg",
          bannerUrl: "/images/default-room-banner.jpg"
        }
      });
      insertedRooms.push(room);
    }
    console.log(`🏠 Inserted ${insertedRooms.length} Rooms`);

    // --- B. SEED CATEGORIES (Handling Hierarchy) ---
    const categoryMap = {}; 
    let catCount = 0;

    for (const [primaryName, subCategories] of Object.entries(categoryHierarchy)) {
      const primaryCat = await Category.create({
        name: primaryName,
        slug: generateSlug(primaryName),
        description: `Explore our collection of premium ${primaryName.toLowerCase()}.`,
        parentCategory: null,
        // 🚀 STATIC LOCAL PATH FOR PRIMARY CATEGORY
        image: "/images/default-category.jpg"
      });
      catCount++;

      for (const subName of subCategories) {
        const subCat = await Category.create({
          name: subName,
          slug: generateSlug(subName),
          description: `Find the perfect ${subName.toLowerCase()} for your space.`,
          parentCategory: primaryCat._id,
          // 🚀 STATIC LOCAL PATH FOR SUB-CATEGORY
          image: "/images/default-category.jpg"
        });
        catCount++;
        
        categoryMap[subName] = { primaryId: primaryCat._id, subId: subCat._id };
      }
    }
    console.log(`🗂️ Inserted ${catCount} Categories (Primary & Sub)`);

    // --- C. SEED 200 PRODUCTS ---
    const productsToInsert = [];
    const subCategoryNames = Object.keys(categoryMap); 

    for (let i = 1; i <= 200; i++) {
      const brand = randomElement(brands);
      const material = randomElement(materials);
      const color = randomElement(colors);
      const subCatName = randomElement(subCategoryNames);
      const categoryRefs = categoryMap[subCatName];
      const roomRef = randomElement(insertedRooms);
      
      const productName = `${brand} ${material} ${subCatName.split(' ')[0]} - Series ${randomNumber(100, 999)}`;
      const cost = randomNumber(20, 500);
      const markup = randomNumber(15, 25) / 10; 
      const originalPrice = Math.round(cost * markup);
      const isOnSale = Math.random() > 0.7; 
      const currentPrice = isOnSale ? Math.round(originalPrice * 0.8) : originalPrice; 

      productsToInsert.push({
        sku: `SKU-${brand.substring(0,3).toUpperCase()}-${randomNumber(10000, 99999)}`,
        name: productName,
        slug: generateSlug(`${productName}-${i}`),
        shortDescription: `A beautiful ${color.toLowerCase()} ${subCatName.toLowerCase()} crafted from premium ${material.toLowerCase()}.`,
        longDescription: `Elevate your ${roomRef.name.toLowerCase()} with the ${productName}. Designed by the experts at ${brand}, this piece seamlessly blends modern aesthetics with everyday functionality. It features high-quality ${material.toLowerCase()} construction and a stunning ${color.toLowerCase()} finish. Perfect for any contemporary home seeking both style and durability.`,
        brand: brand,
        
        pricing: {
          originalPrice: originalPrice,
          currentPrice: currentPrice,
          isOnSale: isOnSale,
          costPerItem: cost
        },
        
        categorization: {
          primary: categoryRefs.primaryId,
          subCategory: categoryRefs.subId,
          tags: [material.toLowerCase(), color.toLowerCase(), brand.toLowerCase().replace(' ', '')],
          rooms: [roomRef._id], 
          materials: [material],
          colors: [color]
        },
        
        physical: {
          dimensions: {
            width: randomNumber(40, 200),
            height: randomNumber(40, 200),
            depth: randomNumber(30, 100)
          },
          weight: randomNumber(5, 80),
          assemblyRequired: Math.random() > 0.5
        },
        
        media: {
          // 🚀 STATIC LOCAL PATHS FOR PRODUCTS
          primaryImage: "/images/default-product.jpg",
          gallery: [
            "/images/default-product.jpg",
            "/images/default-product.jpg"
          ]
        },
        
        inventory: {
          stockQuantity: randomNumber(0, 150), 
        },
        
        social: {
          averageRating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1), 
          reviewCount: randomNumber(0, 300)
        }
      });
    }

    await Product.insertMany(productsToInsert);
    console.log(`🛋️ Successfully inserted ${productsToInsert.length} Products`);
    
    console.log("✅ Database seeding complete!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:");
    console.error(error);
    process.exit(1);
  }
};

seedDB();