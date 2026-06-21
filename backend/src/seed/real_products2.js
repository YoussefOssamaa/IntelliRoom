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
const MONGO_URI = "mongodb+srv://admin:b97gemodlECs50zC@cluster0.2aewhnb.mongodb.net/?appName=Cluster0";
console.log(MONGO_URI);
const SUPABASE_BASE_URL = "https://hjjmgzttefanatsfatul.supabase.co/storage/v1/object/public/products/";

// ==========================================
// CATEGORY MAPPING LOOKUP
// ==========================================
// ==========================================
// CATEGORY MAPPING LOOKUP (With CSV Variants)
// ==========================================
const CATEGORY_MAP = {
    // Beds & Bedroom
    "Beds & Bedroom": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9b6"),
    "Beds & Bedrooms": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9b6"), // Alias variant

    // Seating
    "Seating": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd998"),

    // Storage & Cabinetry
    "Storage & Cabinetry": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9ac"),

    // Lighting
    "Lighting": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9bc"),

    // Tables & Desks
    "Tables & Desks": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9a2"),
    "workspace": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9a2"), // Alias map for executive desks

    // Rugs & Decor
    "Rugs & Decor": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9c6"),
    "Rugs & Rugs & Decor": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9c6"), // Alias variant
    "screen": new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9c6"), // Mapping dividers to decor

    // Door
    "Door": new mongoose.Types.ObjectId("6a35e99f96fd52c207a313d2")
};

// Fallback category ID to prevent Mongoose validation failures
const DEFAULT_CATEGORY_ID = new mongoose.Types.ObjectId("69fa3408e90db4b7029bd9c6"); // Defaulting to Rugs & Decor

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


                // Map row.type to our hardcoded list of defined ObjectIds
                const csvType = (row.type || '').trim();

                // Fallback gracefully to your choice of baseline category instead of null
                let primaryCategoryId = CATEGORY_MAP[csvType];

                if (!primaryCategoryId) {
                    console.warn(`⚠️ Warning: Unknown type "${csvType}" on item "${row.name}". Using fallback default category.`);
                    primaryCategoryId = DEFAULT_CATEGORY_ID;
                }



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
                        primary: primaryCategoryId, // Use the matched ObjectId here
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

                    // Clean out old improperly categorized products first if you are rebuilding the database
                    // await Product.deleteMany({}); 

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