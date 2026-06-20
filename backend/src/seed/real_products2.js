import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import csv from "csv-parser";

// Models
import Product from "../models/ecommerceModels/product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname, "");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });



const CSV_FILE_PATH = "/workspace/furniture_images/furniture_dataset.csv";
const MONGO_URI = process.env.MONGO_URI
console.log(MONGO_URI)
const SUPABASE_BASE_URL = "https://hjjmgzttefanatsfatul.supabase.co/storage/v1/object/public/products/";

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function generateSlug(name) {
    if (!name) return '';

    let slug = name.toString().toLowerCase().trim();
    slug = slug.replace(/[^a-z0-9\s-]/g, '');
    slug = slug.replace(/[\s-]+/g, '-');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${slug}-${suffix}`;
}

function generateShortDescription(description) {
    if (!description) return '';
    const desc = description.toString().trim();
    return desc.length <= 150 ? desc : desc.slice(0, 147) + '...';
}

function parseArrayField(field) {
    if (!field) return [];
    return field.split(',').map(item => item.trim()).filter(Boolean);
}

// ==========================================
// MAIN IMPLEMENTATION
// ==========================================
async function parseCsvAndPush() {
    try {
        // 1. Connect exclusively via Mongoose
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Connected via Mongoose");

        const documents = [];
        console.log(`Streaming and parsing CSV from: ${CSV_FILE_PATH}`);

        // 2. Stream and map using Mongoose Model structure
        fs.createReadStream(CSV_FILE_PATH)
            .pipe(csv()) // or csv({ separator: '\t' }) if tab-delimited
            .on('data', (row) => {
                const filename = (row.filename || '').trim();
                if (!filename) return;


                const sku = path.parse(filename).name;
                const imageUrl = `${SUPABASE_BASE_URL}${sku}.webp`;

                // Constructing according to your Product schema rules
                const productDoc = {
                    sku: sku,
                    name: row.name,
                    slug: generateSlug(row.name),
                    shortDescription: generateShortDescription(row.description),
                    longDescription: row.description,
                    brand: "IntelliRoom Collection",
                    pricing: {
                        originalPrice: row.max_price ? parseFloat(row.max_price) : 0,
                        currentPrice: row.min_price ? parseFloat(row.min_price) : 0,
                        isOnSale: parseFloat(row.min_price) < parseFloat(row.max_price),
                        costPerItem: Math.round((parseFloat(row.min_price || 0) * 0.55) * 100) / 100
                    },
                    categorization: {
                        primary: new mongoose.Types.ObjectId(), // Placeholder or replace with actual dynamic lookup mapping
                        subCategory: null,
                        tags: parseArrayField(row.tags),
                        rooms: parseArrayField(row.room_fit).map(() => new mongoose.Types.ObjectId()),
                        materials: parseArrayField(row.materials),
                        colors: row.exact_color ? [row.exact_color.trim()] : []
                    },
                    physical: {
                        dimensions: { width: 90, height: 85, depth: 80 },
                        weight: 28,
                        assemblyRequired: true
                    },
                    media: {
                        primaryImage: imageUrl,
                        gallery: [imageUrl],
                        threeDModelUrl: null
                    },
                    inventory: { stockQuantity: 20, inStock: true },
                    social: { averageRating: 4.5, reviewCount: 15, featuredInDesigns: [] }
                };

                documents.push(productDoc);
            })
            .on('end', async () => {
                if (documents.length > 0) {
                    console.log(`Prepared ${documents.length} documents. Inserting via Mongoose...`);

                    // Insert using Mongoose Model batch operation
                    const result = await Product.insertMany(documents);
                    console.log(`Successfully inserted ${result.length} products!`);
                } else {
                    console.log("⚠️ No records parsed.");
                }
                await mongoose.disconnect();
            });

    } catch (error) {
        console.error("❌ An error occurred:", error);
        await mongoose.disconnect();
    }
}

parseCsvAndPush();