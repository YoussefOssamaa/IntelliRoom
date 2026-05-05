import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    // 1. Core Identifiers
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortDescription: { type: String, required: true, maxLength: 200 },
    longDescription: { type: String, required: true },
    brand: { type: String, required: true },

    // 2. Pricing & Economics
    pricing: {
        originalPrice: { type: Number, required: true },
        currentPrice: { type: Number, required: true, 
                        min: [0.01, 'Price must be at least $0.01'] },
        isOnSale: { type: Boolean, default: false },
        costPerItem: { type: Number, required: true, select: false } 
    },

    // 3. Categorization & Discovery (🚀 THE MAJOR UPDATES ARE HERE)
    categorization: {
        // Now references the Category model directly
        primary: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Category', 
            required: true, 
            index: true 
        },
        // Subcategory also references the Category model (e.g., pointing to "Sofas")
        subCategory: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Category' 
        },
        tags: [{ type: String }],
        rooms: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Room' 
        }],
        materials: [{ type: String }],
        colors: [{ type: String }]
    },

    // 4. Physical Attributes
    physical: {
        dimensions: {
            width: { type: Number }, // in cm
            height: { type: Number },
            depth: { type: Number }
        },
        weight: { type: Number }, // in kg
        assemblyRequired: { type: Boolean, default: false }
    },

    // 5. Media & AI Assets
    media: {
        primaryImage: { type: String, required: true },
        gallery: [{ type: String }],
        // Critical for sending data to your AI generation workflow
        threeDModelUrl: { type: String } 
    },

    // 6. Inventory & Logistics
    inventory: {
        stockQuantity: { type: Number, required: true, min: 0 },
        inStock: { type: Boolean, default: true },
        shippingDimensions: {
            width: Number, height: Number, depth: Number, weight: Number
        }
    },

    // 7. Social Proof & Community
    social: {
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 },
        // Links this product to community AI designs that feature it
        featuredInDesigns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CommunityDesign' }]
    }
}, { 
    timestamps: true 
});

// Pre-save middleware: Automatically update 'inStock' based on 'stockQuantity'
productSchema.pre('save', function() {
    // Only run this math if the inventory object actually exists on the product
    if (this.inventory && this.inventory.stockQuantity !== undefined) {
        this.inventory.inStock = this.inventory.stockQuantity > 0;
    }
});

productSchema.index({ name: 'text', description: 'text', brand: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;