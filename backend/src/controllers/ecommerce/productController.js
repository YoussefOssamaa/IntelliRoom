import mongoose from 'mongoose';
import Product from '../../models/ecommerceModels/product.js';
import Category from '../../models/ecommerceModels/category.js'; 
import Room from '../../models/ecommerceModels/room.js';

// @desc    Fetch all products (with filtering, sorting, and pagination)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
    try {
        // 🚀 THE FIX: Added categories (plural), minPrice, and maxPrice
        const { category, categories, room, inStockOnly, materials, colors, sort, search, minPrice, maxPrice } = req.query;
        let query = {};

        // 1. 🚀 Filter by Room (Translating slug to ObjectId!)
        if (room) {
            const roomDoc = await Room.findOne({ slug: room });
            if (roomDoc) {
                query['categorization.rooms'] = roomDoc._id; 
            } else {
                // If the room doesn't exist, return an empty array immediately
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        // 2. Filter by Primary Category (Singular - for main store page)
        if (category && category !== 'All') {
            if (mongoose.Types.ObjectId.isValid(category)) {
                query['categorization.primary'] = category;
            } else {
                const foundCategory = await Category.findOne({ name: category });
                if (foundCategory) {
                    query['categorization.primary'] = foundCategory._id;
                } else {
                    query['categorization.primary'] = null; 
                }
            }
        }

        // 3. 🚀 Filter by SubCategories (Plural - for the Room Page sidebar checkboxes)
        if (categories) {
            const catNames = categories.split(',');
            // Find all matching category IDs in one go
            const foundCats = await Category.find({ name: { $in: catNames } });
            const catIds = foundCats.map(c => c._id);
            
            if (catIds.length > 0) {
                query['categorization.subCategory'] = { $in: catIds };
            } else {
                query['categorization.subCategory'] = null; 
            }
        }

        // 4. 🚀 Filter by Price Ranges
        if (minPrice || maxPrice) {
            query['pricing.currentPrice'] = {};
            if (minPrice) query['pricing.currentPrice'].$gte = Number(minPrice);
            if (maxPrice) query['pricing.currentPrice'].$lte = Number(maxPrice);
        }

        // 5. Filter by Availability
        if (inStockOnly === 'true') {
            query['inventory.inStock'] = true;
        }

        // 6. Filter by Materials
        if (materials) {
            const materialsArray = materials.split(','); 
            query['categorization.materials'] = { $in: materialsArray };
        }

        // 7. Filter by Colors
        if (colors) {
            const colorsArray = colors.split(','); 
            query['categorization.colors'] = { $in: colorsArray };
        }

        // 8. Search by Name
        if (search) {
            query.name = { $regex: search, $options: 'i' }; 
        }

        // Handle Sorting
        let sortOption = {};
        switch (sort) {
            case 'Price: Low to High':
                sortOption = { 'pricing.currentPrice': 1 }; 
                break;
            case 'Price: High to Low':
                sortOption = { 'pricing.currentPrice': -1 }; 
                break;
            case 'Customer Rating':
                sortOption = { 'social.averageRating': -1 };
                break;
            case 'Name: A-Z':
                sortOption = { name: 1 };
                break;
            default:
                sortOption = { createdAt: -1 }; 
        }

        // Execute the massive, perfectly structured query
        const products = await Product.find(query)
            .populate('categorization.primary', 'name slug')
            .populate('categorization.subCategory', 'name slug')
            .sort(sortOption);

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, message: 'Server Error fetching products', error: error.message });
    }
};

// ... (The rest of your controller functions remain exactly the same below!) ...

// @desc    Fetch a single product by its URL slug
// @route   GET /api/products/:slug
// @access  Public
export const getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug })
            .populate('categorization.primary', 'name slug')
            .populate('categorization.subCategory', 'name slug');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error("Error fetching single product:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getUniqueRooms = async (req, res) => {
    try {
        const rooms = await Product.distinct("categorization.rooms");
        res.status(200).json({ success: true, data: rooms });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getProductFormOptions = async (req, res) => {
    try {
        const colors = await Product.distinct('categorization.colors');
        const materials = await Product.distinct('categorization.materials');
        const categories = await Category.find({});
        
        const roomsFromDB = await Room.find({ isActive: true });
        const rooms = roomsFromDB.map(room => ({ 
            _id: room._id, 
            name: room.name 
        })); 

        res.status(200).json({
            success: true,
            data: {
                colors: colors.filter(Boolean), 
                materials: materials.filter(Boolean),
                rooms: rooms,
                categories: categories
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProduct = async (req, res) => {
    try {
        const productData = req.body;

        if (productData.categorization) {
            if (typeof productData.categorization.primary === 'string' && productData.categorization.primary.trim() !== '') {
                const primaryMatch = await Category.findOne({ name: productData.categorization.primary });
                if (primaryMatch) productData.categorization.primary = primaryMatch._id;
            }
            if (typeof productData.categorization.subCategory === 'string' && productData.categorization.subCategory.trim() !== '') {
                const subMatch = await Category.findOne({ name: productData.categorization.subCategory });
                if (subMatch) productData.categorization.subCategory = subMatch._id;
            }
        }

        const newProduct = new Product(productData);
        await newProduct.save();
        
        res.status(201).json({ success: true, data: newProduct });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.categorization) {
            if (typeof updateData.categorization.primary === 'string' && updateData.categorization.primary.trim() !== '') {
                const primaryMatch = await Category.findOne({ name: updateData.categorization.primary });
                if (primaryMatch) updateData.categorization.primary = primaryMatch._id;
            }
            
            if (typeof updateData.categorization.subCategory === 'string' && updateData.categorization.subCategory.trim() !== '') {
                const subMatch = await Category.findOne({ name: updateData.categorization.subCategory });
                if (subMatch) updateData.categorization.subCategory = subMatch._id;
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
            new: true, 
            runValidators: true 
        });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, data: updatedProduct });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedProduct = await Product.findByIdAndDelete(id);
        
        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}