import mongoose from "mongoose";
import csv from "csv-parser";
import fs from "fs";
import slugify from "slugify";
import Product from "../models/ecommerceModels/product.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Category from "../models/ecommerceModels/category.js";
import Room from "../models/ecommerceModels/room.js";


const CSV_FILE_PATH = "/workspace/furniture_images/furniture_dataset.csv";





const seedRealProducts = async () => {

  try {
    // Connect to DB
    const MONGO_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_DB}`;
    console.log(MONGO_URI);
    await mongoose.connect(MONGO_URI)
      .then(() => console.log("✅ MongoDB Connected"))
      .catch(err => console.error("❌ Connection Error:", err));


    console.log("📥 Reading CSV file...");

    const productsToInsert = [];
    const roomMap = {};
    const categoryMap = {};

    const categories = await Category.find();
    const rooms = await Room.find();

    rooms.forEach(r => roomMap[r.name] = r._id);
    categories.forEach(c => categoryMap[c.name] = c._id);

    const defaultCategory = categories.length > 0 ? categories[0]._id : null;
    const defaultRoom = rooms.length > 0 ? rooms[0]._id : null;

    if (!defaultCategory || !defaultRoom) {
      console.log("❌ Please seed categories and rooms first!");
      mongoose.disconnect();
      return;
    }

    let rowIndex = 0;
    // === 2. Read CSV and Create Products ===
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          rowIndex++;
          const filename = row.filename?.trim();
          if (!filename) return;

          const roomName = row.room_fit?.trim() || "Living Room";

          const product = {
            sku: filename.replace(/\.png|\.jpg|\.jpeg$/i, '').toLowerCase(),
            name: row.name?.trim() || "Unnamed Product",
            slug: slugify(row.name || filename, { lower: true, strict: true }) + `-${rowIndex}`,

            shortDescription: row.description ? row.description.substring(0, 180) + "..." : "",
            longDescription: row.description || "",

            brand: "IntelliRoom Collection",

            pricing: {
              originalPrice: parseFloat(row.max_price) || 1299,
              currentPrice: parseFloat(row.min_price) || parseFloat(row.max_price) || 899,
              isOnSale: parseFloat(row.min_price) < parseFloat(row.max_price),
              costPerItem: parseFloat(row.min_price) * 0.55 || 450,
            },

            categorization: {
              primary: categoryMap[row.category?.trim()] || defaultCategory,
              subCategory: null,
              tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
              rooms: [roomMap[roomName] || defaultRoom],
              materials: row.materials ? row.materials.split(',').map(m => m.trim()) : [],
              colors: row.exact_color ? [row.exact_color.trim()] : [],
            },

            physical: {
              dimensions: { width: 90, height: 85, depth: 80 },
              weight: 28,
              assemblyRequired: true,
            },

            media: {
              primaryImage: `/workspace/furniture_images/${filename}`,
              gallery: [`/workspace/furniture_images/${filename}`],
              threeDModelUrl: null,
            },

            inventory: {
              stockQuantity: 12 + Math.floor(Math.random() * 25),
              inStock: true,
            },

            social: {
              averageRating: 4.3,
              reviewCount: 18 + Math.floor(Math.random() * 40),
            }
          };

          productsToInsert.push(product);

        } catch (err) {
          console.error("Error processing row:", row.filename, err.message);
        }
      })
      .on('end', async () => {
        console.log(`\n📊 Processed ${productsToInsert.length} products from CSV`);

        if (productsToInsert.length > 0) {
          try {
            const inserted = await Product.insertMany(productsToInsert, { ordered: false });
            console.log(`✅ Successfully imported ${inserted.length} real products!`);
          } catch (err) {
            const insertedCount = err.insertedDocs ? err.insertedDocs.length : 0;
            console.log(`✅ Successfully imported ${insertedCount} real products (some duplicates may have been skipped).`);
            if (!err.insertedDocs) console.error("Error inserting products:", err.message);
          }
        }
        mongoose.disconnect();
      });

  } catch (error) {
    console.error("❌ Import failed:", error);
    mongoose.disconnect();
  }
};

seedRealProducts();