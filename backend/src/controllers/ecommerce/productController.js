import Product from '../../models/ecommerceModels/product.js';

// @desc    Fetch all products (with filtering, sorting, and pagination)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
    try {
        // 1. Destructure the query parameters sent from your React ProductFilter
        const { category, inStockOnly, materials, sort, search } = req.query;

        // 2. Build the MongoDB Query Object
        let query = {};

        // Filter by Category (if it's not "All")
        if (category && category !== 'All') {
            query['categorization.primary'] = category;
        }

        // Filter by Availability
        if (inStockOnly === 'true') {
            query['inventory.inStock'] = true;
        }

        // Filter by Materials (if the array exists and has items)
        // Using $in means "Find products where the material is ANY of these selected materials"
        if (materials) {
            const materialsArray = materials.split(','); // Convert "Wood,Velvet" to ['Wood', 'Velvet']
            query['categorization.materials'] = { $in: materialsArray };
        }

        // Search by Name (using Regex for partial matching)
        if (search) {
            query.name = { $regex: search, $options: 'i' }; // 'i' makes it case-insensitive
        }

        // 3. Handle Sorting
        let sortOption = {};
        switch (sort) {
            case 'Price: Low to High':
                sortOption = { 'pricing.currentPrice': 1 }; // 1 is ascending
                break;
            case 'Price: High to Low':
                sortOption = { 'pricing.currentPrice': -1 }; // -1 is descending
                break;
            case 'Customer Rating':
                sortOption = { 'social.averageRating': -1 };
                break;
            case 'Name: A-Z':
                sortOption = { name: 1 };
                break;
            default:
                sortOption = { createdAt: -1 }; // 'Recommended' or default: newest first
        }

        // 4. Execute the Query
        const products = await Product.find(query).sort(sortOption);

        // 5. Send the response back to React
        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, message: 'Server Error fetching products' });
    }
};

// @desc    Fetch a single product by its URL slug
// @route   GET /api/products/:slug
// @access  Public
export const getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error("Error fetching single product:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};