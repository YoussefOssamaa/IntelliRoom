import Review from '../../models/ecommerceModels/ReviewModel.js';
import Order from '../../models/ecommerceModels/Order.js';

export const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.user._id; // Assuming you have authentication middleware

    // Check if user actually bought this item to flag as verified
    const hasBought = await Order.findOne({
      user: userId,
      status: { $in: ['delivered', 'shipped', 'completed'] },
      'items.product': productId
    });

    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      title,
      comment,
      isVerifiedPurchase: !!hasBought
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    // Handle duplicate review error
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "You have already reviewed this product." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Simple pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'firstName lastName profile_picture_url')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};