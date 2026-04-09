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
        currentPrice: { type: Number, required: true },
        isOnSale: { type: Boolean, default: false },
        costPerItem: { type: Number, required: true, select: false } // select: false hides this from the frontend automatically!
    },

    // 3. Categorization & Discovery
    categorization: {
        primary: { type: String, required: true, index: true }, // Indexed for faster filtering
        subCategory: { type: String },
        tags: [{ type: String }],
        rooms: [{ type: String, enum: ['living-room', 'bedroom', 'dining-room', 'kitchen', 'bathroom', 'office'] }],
        materials: [{ type: String }],
        colors: [{ type: String }]
    },

    // 4. Physical Attributes
    physical: {
        dimensions: {
            width: { type: Number }, // in cm or inches
            height: { type: Number },
            depth: { type: Number }
        },
        weight: { type: Number },
        assemblyRequired: { type: Boolean, default: false }
    },

    // 5. Media & AI Assets
    media: {
        primaryImage: { type: String, required: true },
        gallery: [{ type: String }],
        threeDModelUrl: { type: String } // Crucial for your AI generation features
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
    timestamps: true // Automatically adds createdAt and updatedAt dates
});

// Pre-save middleware: Automatically update 'inStock' based on 'stockQuantity'
productSchema.pre('save', function(next) {
    this.inventory.inStock = this.inventory.stockQuantity > 0;
    next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;