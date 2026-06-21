import Order from '../../models/ecommerceModels/order.js';
import TrafficSession from '../../models/ecommerceModels/TrafficSessionModel.js';
import Cart from '../../models/ecommerceModels/cart.js';
import Product from '../../models/ecommerceModels/product.js';

export const getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Calculate Traffic & Conversion (Glance KPIs)
    const dailyVisitorsCount = await TrafficSession.countDocuments({
      createdAt: { $gte: today }
    });

    const activeCarts = await Cart.countDocuments({ status: 'active' });
    const abandonedCarts = await Cart.countDocuments({ status: 'abandoned' });
    const convertedCarts = await Cart.countDocuments({ status: 'converted' });
    
    const totalCarts = activeCarts + abandonedCarts + convertedCarts;
    const cartAbandonmentRate = totalCarts > 0 ? ((abandonedCarts / totalCarts) * 100).toFixed(1) : 0;
    const conversionRate = dailyVisitorsCount > 0 ? ((convertedCarts / dailyVisitorsCount) * 100).toFixed(1) : 0;

    // 2. Calculate Gross Merchandise Value (GMV)
    const gmvAggregation = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const gmv = gmvAggregation.length > 0 ? gmvAggregation[0].total : 0;

    // 3. Traffic Sources Breakdown
    const trafficSources = await TrafficSession.aggregate([
      { $group: { _id: '$source', sessions: { $sum: 1 } } },
      { $project: { source: '$_id', sessions: 1, _id: 0 } },
      { $sort: { sessions: -1 } }
    ]);

    // 4. Recent Orders Stream
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'firstName lastName')
      .select('user totalPrice status createdAt orderId'); // Assuming you add orderId to schema, or use _id

    // 5. Top Selling Products (Requires you to add `unitsSold` and `revenueGenerated` to Product schema)
    // For now, we will aggregate from Orders (Note: In production, save this on the Product model to avoid heavy queries)
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { 
          _id: '$items.product', 
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.priceAtAdd', '$items.quantity'] } }
      }},
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: {
          from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails'
      }},
      { $unwind: '$productDetails' },
      { $project: {
          productId: '$_id',
          name: '$productDetails.name',
          unitsSold: 1,
          revenue: 1,
          stockStatus: { $cond: { if: '$productDetails.inventory.inStock', then: 'in_stock', else: 'out_of_stock' } }
      }}
    ]);

    // Construct the final JSON payload matching our earlier design
    res.status(200).json({
      success: true,
      kpis: {
        dailyVisitors: { value: dailyVisitorsCount, trendPercentage: 0, isPositive: true },
        conversionRate: { value: parseFloat(conversionRate), trendPercentage: 0, isPositive: true },
        gmv: { value: gmv, currency: "USD", trendPercentage: 0, isPositive: true },
        cartAbandonment: { value: parseFloat(cartAbandonmentRate), trendPercentage: 0, isPositive: false }
      },
      trafficSources,
      topProducts,
      recentOrders: recentOrders.map(order => ({
        orderId: order._id,
        customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest',
        total: order.totalPrice,
        status: order.status,
        timestamp: order.createdAt
      }))
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Failed to load dashboard data" });
  }
};