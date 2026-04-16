import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/ecommerceModels/product.js';

// Load your environment variables (so it can read your MONGO_URI)
dotenv.config();

// The variations to randomly choose from
const categories = ['Seating', 'Lighting', 'Tables', 'Decor', 'Storage'];
const materialsList = ['Wood', 'Metal', 'Glass', 'Velvet', 'Leather', 'Boucle'];
const brands = ['IntelliRoom Originals', 'Aura Design', 'Nordic Minimal', 'Lumina'];
const images = [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80'
];

// Helper function to get random items
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const generateProducts = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        console.log('Clearing old test products...');
        await Product.deleteMany({}); // Clears the database so we have a fresh start

        const productsToInsert = [];

        // Loop through each category
        for (const category of categories) {
            // Generate 20 products for this specific category
            for (let i = 1; i <= 20; i++) {
                
                const currentPrice = getRandomNumber(50, 1500);
                const isOnSale = Math.random() > 0.7; // 30% chance to be on sale
                const originalPrice = isOnSale ? currentPrice + getRandomNumber(50, 300) : currentPrice;
                const stockQuantity = getRandomNumber(0, 50); // Some will be 0 (Out of stock!)

                // Grab 1 or 2 random materials
                const productMaterials = [getRandomItem(materialsList)];
                if (Math.random() > 0.5) productMaterials.push(getRandomItem(materialsList));

                productsToInsert.push({
                    sku: `INT-${category.substring(0, 3).toUpperCase()}-${1000 + i}-${Date.now()}`,
                    name: `${getRandomItem(brands)} ${category} Model ${i}`,
                    slug: `${category.toLowerCase()}-model-${i}-${Date.now()}`,
                    shortDescription: `A beautiful and modern addition to your ${category.toLowerCase()} collection.`,
                    longDescription: 'This premium piece is designed to elevate your interior space. It features sustainable materials and a timeless aesthetic perfectly suited for AI-generated room concepts.',
                    brand: getRandomItem(brands),
                    pricing: {
                        originalPrice: originalPrice,
                        currentPrice: currentPrice,
                        isOnSale: isOnSale,
                        costPerItem: currentPrice * 0.4 // 60% profit margin
                    },
                    categorization: {
                        primary: category,
                        materials: [...new Set(productMaterials)] // Removes duplicates
                    },
                    media: {
                        primaryImage: getRandomItem(images)
                    },
                    inventory: {
                        stockQuantity: stockQuantity,
                        inStock: stockQuantity > 0
                    },
                    social: {
                        averageRating: (Math.random() * (5 - 3) + 3).toFixed(1), // Random rating between 3.0 and 5.0
                        reviewCount: getRandomNumber(0, 500)
                    }
                });
            }
        }

        console.log(`Inserting ${productsToInsert.length} products...`);
        await Product.insertMany(productsToInsert);
        
        console.log('✅ Database Seeded Successfully!');
        process.exit();

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

generateProducts();