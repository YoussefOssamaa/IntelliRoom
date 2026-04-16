import mongoose from 'mongoose';
import Product from '../src/models/ecommerceModels/product.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ❌ REMOVE: import 'dotenv/config';
// ✅ ADD: Explicitly load .env from backend root (parent directory)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Debug: Check if variables loaded (remove after fixing)
console.log('MONGO_HOST:', process.env.MONGO_HOST);
console.log('MONGO_PORT:', process.env.MONGO_PORT);
console.log('MONGO_USER:', process.env.MONGO_USER ? '***set***' : 'undefined');
console.log('MONGO_DB:', process.env.MONGO_DB);

const dataPath = path.resolve(__dirname, 'products.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));



// Strip MongoDB Extended JSON wrappers
const cleanData = rawData.map(item => ({
    sku: item.sku,
    name: item.name,
    slug: item.slug,
    description: item.description,
    brand: item.brand,
    pricing: item.pricing,
    categorization: item.categorization,
    physical: item.physical,
    media: item.media,
    inventory: {
        stockQuantity: item.inventory?.stockQuantity ?? 0,
        inStock: item.inventory?.inStock ?? true,
        shippingDimensions: item.inventory?.shippingDimensions || {}
    },    aiStyleTags: item.aiStyleTags,
    social: {
        ...item.social,
        featuredInDesigns: item.social?.featuredInDesigns?.map(d => d.$oid || d)
    },
    vendorUrl: item.vendorUrl
    // Let Mongoose auto-generate _id, createdAt, updatedAt
}));

const { MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_PORT, MONGO_DB, MONGO_AUTH_DB } = process.env;
const MONGO_URI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${MONGO_AUTH_DB}`;

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected. Clearing old products...");
        await Product.deleteMany({});
        console.log("Inserting new products...");
        await Product.insertMany(cleanData);
        console.log(`✅ Successfully inserted ${cleanData.length} products`);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

seed();