import mongoose from 'mongoose';
import Product from '../../models/ecommerceModels/product.js';
import Category from '../../models/ecommerceModels/category.js';
import Room from '../../models/ecommerceModels/room.js';

// @desc    Fetch all products (with filtering, sorting, and pagination)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
    try {
        const { category, categories, room, inStockOnly, materials, colors, sort, search, minPrice, maxPrice, onSale, fields, tags } = req.query;
        let query = {};

        // --- OPTIMIZATION 1: Pagination Setup ---
        const page = parseInt(req.query.page, 10) || 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
        const skip = (page - 1) * limit;

        // 1. Filter by Room (Optimized to accept Object ID directly or fallback to lookup)
        if (room) {
            if (mongoose.Types.ObjectId.isValid(room)) {
                query['categorization.rooms'] = room;
            } else {
                const roomDoc = await Room.findOne({ slug: room });
                if (roomDoc) {
                    query['categorization.rooms'] = roomDoc._id;
                } else {
                    return res.status(200).json({ success: true, count: 0, total: 0, data: [] });
                }
            }
        }

        // 2. Filter by Primary Category (Optimized for Object ID fallback)
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

        // 3. Filter by SubCategories
        if (categories) {
            const catNames = categories.split(',');
            const foundCats = await Category.find({ name: { $in: catNames } });
            const catIds = foundCats.map(c => c._id);

            if (catIds.length > 0) {
                query['categorization.subCategory'] = { $in: catIds };
            } else {
                query['categorization.subCategory'] = null;
            }
        }

        // 4. Filter by Price & Sale
        if (minPrice || maxPrice) {
            query['pricing.currentPrice'] = {};
            if (minPrice) query['pricing.currentPrice'].$gte = Number(minPrice);
            if (maxPrice) query['pricing.currentPrice'].$lte = Number(maxPrice);
        }


        // 5. Filter by Availability
        if (inStockOnly === 'true') {
            query['inventory.inStock'] = true;
        }

        // Filter by Sale Status
        if (onSale === 'true') {
            query['pricing.isOnSale'] = true;
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

        // 8. Search by Name (OPTIMIZATION 3: Using MongoDB Text Indexes instead of Regex)
        if (search) {
            query.$text = { $search: search };
        }

        if (tags) {
            const tagsArray = tags.split(',');
            query['categorization.tags'] = { $in: tagsArray };
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

        // Handle Field Selection (Send only specific data like name/slug if requested)
        const selectOptions = fields ? fields.split(',').join(' ') : '';

        // --- OPTIMIZATION 2: Run Product Query & Count in Parallel ---
        const [products, total] = await Promise.all([
            Product.find(query)
                .select(selectOptions)
                .populate('categorization.primary', 'name slug')
                .populate('categorization.subCategory', 'name slug')
                .sort(sortOption)
                .skip(skip)
                .limit(limit),
            Product.countDocuments(query) // Needed for frontend pagination
        ]);

        res.status(200).json({
            success: true,
            count: products.length,
            total, // Send total available matches back to frontend
            data: products
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, message: 'Server Error fetching products', error: error.message });
    }
};

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

// @desc    Fetch all unique rooms present in products
// @route   GET /api/products/rooms
// @access  Public
export const getUniqueRooms = async (req, res) => {
    try {
        const rooms = await Product.distinct("categorization.rooms");
        res.status(200).json({ success: true, data: rooms });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Fetch dynamic options to populate forms (filters/admin)
// @route   GET /api/products/options
// @access  Public
export const getProductFormOptions = async (req, res) => {
    try {
        // --- OPTIMIZATION: Run all 4 queries simultaneously ---
        const [colors, materials, categories, roomsFromDB] = await Promise.all([
            Product.distinct('categorization.colors'),
            Product.distinct('categorization.materials'),
            Category.find({}),
            Room.find({ isActive: true })
        ]);

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
            // --- OPTIMIZATION: Skip lookup if an Object ID is already passed ---
            if (typeof productData.categorization.primary === 'string' && productData.categorization.primary.trim() !== '' && !mongoose.Types.ObjectId.isValid(productData.categorization.primary)) {
                const primaryMatch = await Category.findOne({ name: productData.categorization.primary });
                if (primaryMatch) productData.categorization.primary = primaryMatch._id;
            }
            if (typeof productData.categorization.subCategory === 'string' && productData.categorization.subCategory.trim() !== '' && !mongoose.Types.ObjectId.isValid(productData.categorization.subCategory)) {
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
            // --- OPTIMIZATION: Skip lookup if an Object ID is already passed ---
            if (typeof updateData.categorization.primary === 'string' && updateData.categorization.primary.trim() !== '' && !mongoose.Types.ObjectId.isValid(updateData.categorization.primary)) {
                const primaryMatch = await Category.findOne({ name: updateData.categorization.primary });
                if (primaryMatch) updateData.categorization.primary = primaryMatch._id;
            }

            if (typeof updateData.categorization.subCategory === 'string' && updateData.categorization.subCategory.trim() !== '' && !mongoose.Types.ObjectId.isValid(updateData.categorization.subCategory)) {
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