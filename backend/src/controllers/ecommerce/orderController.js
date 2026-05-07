import Order from '../../models/ecommerceModels/order.js';
import Cart from '../../models/ecommerceModels/cart.js';
import { z } from 'zod';

const TEST_USER_ID = "64f3a5e6a3c9b7f1a1234567"; // To be removed when auth is fully linked

// ============================================================================
// VALIDATION SCHEMAS 
// ============================================================================

const orderStatusSchema = z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']);

const updateOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional()
});

// ============================================================================
// HELPER FUNCTIONS 
// ============================================================================

const populateOrder = (query) => {
  return query
    .populate('user', 'name email phone')
    .populate('items.product', 'name price image');
};

const formatOrderResponse = (order) => {
  return {
    _id: order._id,
    user: order.user,
    items: order.items,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    totalPrice: order.totalPrice,
    status: order.status,
    trackingNumber: order.trackingNumber,
    isPaid: order.isPaid,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
  };
};

// ============================================================================
// CUSTOMER CONTROLLERS
// ============================================================================

/**
 * Create a new order from user's cart (Fixed Schema Crash)
 * POST /order
 */
export const postOrderController = async (req, res) => {
  try {
    req.user = { id: TEST_USER_ID }; // Mock Auth

    // Require shipping and payment
    const { shippingAddress, paymentMethod, orderNotes } = req.body;
    
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'Shipping address and payment method are required' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    const newOrder = new Order({
      user: req.user.id,
      items: cart.items,
      shippingAddress,
      paymentMethod,
      orderNotes: orderNotes || ""
    });

    await newOrder.save();

    const populatedOrder = await populateOrder(Order.findById(newOrder._id));

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: formatOrderResponse(populatedOrder),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create order', message: err.message });
  }
};

/**
 * Cancel order (Soft Delete instead of Hard Delete)
 * PUT /order/:id/cancel
 */
export const cancelOrderController = async (req, res) => {
  try {
    req.user = { id: TEST_USER_ID }; // Mock Auth
    const { id } = req.params;

    if (!id || id.length !== 24) return res.status(400).json({ success: false, error: 'Invalid order ID' });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (["processing", "shipped", "delivered"].includes(order.status)) {
      return res.status(400).json({ success: false, error: `Cannot cancel an order that is ${order.status}.` });
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({ success: true, message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to cancel order', message: err.message });
  }
};


// ============================================================================
// ADMIN CONTROLLERS
// ============================================================================

/**
 * Admin: Get ALL orders (Restored Pagination & Search!)
 * GET /order/admin/all
 */
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || "all";
    const search = req.query.search || "";

    let query = {};
    if (status !== "all") query.status = status;
    if (search && search.match(/^[0-9a-fA-F]{24}$/)) query._id = search;

    const skip = (page - 1) * limit;

    const orders = await populateOrder(Order.find(query))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: orders.map(formatOrderResponse), 
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders', message: err.message });
  }
};

/**
 * Admin: Update order status & tracking (Restored Tracking Logic + Zod!)
 * PUT /order/admin/:id/status
 */
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.length !== 24) return res.status(400).json({ success: false, error: 'Invalid order ID' });

    // 🚀 Using your Zod validation!
    const validationResult = updateOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, error: 'Invalid data', details: validationResult.error.errors });
    }

    const { status, trackingNumber, shippingCarrier } = validationResult.data;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (status) order.status = status;
    
    if (status === "paid" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
    }

    if (status === "shipped") {
      if (trackingNumber) order.trackingNumber = trackingNumber;
      if (shippingCarrier) order.shippingCarrier = shippingCarrier;
    }

    if (status === "delivered" && !order.deliveredAt) order.deliveredAt = Date.now();

    await order.save();
    const updatedOrder = await populateOrder(Order.findById(order._id));

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: formatOrderResponse(updatedOrder),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update order', message: err.message });
  }
};


/**
 * Get logged-in user's orders (Order History)
 * GET /order/my-orders
 */
export const getUserOrdersController = async (req, res) => {
  try {
    // req.userId is provided by your 'protect' middleware
    if (!req.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - User ID not found' 
      });
    }

    // Fetch orders belonging to this specific user, newest first
    const orders = await populateOrder(
      Order.find({ user: req.userId })
    ).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders.map(formatOrderResponse), // Using your great formatter!
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user orders', 
      message: err.message 
    });
  }
};