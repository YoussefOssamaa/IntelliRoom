import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import axios from "../../../config/axios.config";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchDashboardData = useCallback(async (isRetry = false) => {
    try {
      if (isRetry) setIsRetrying(true);
      else setLoading(true);
      
      setError(null);

      const response = await axios.get('/ecomm/admin/dashboard/overview');
      setData(response.data);


    //   setData({
    //     success: true,
    //     kpis: {
    //       dailyVisitors: { value: 14250, trendPercentage: 5.2, isPositive: true },
    //       conversionRate: { value: 3.4, trendPercentage: -0.8, isPositive: false },
    //       gmv: { value: 52400.00, currency: "USD", trendPercentage: 12.1, isPositive: true },
    //       cartAbandonment: { value: 68.5, trendPercentage: 1.2, isPositive: false }
    //     },
    //     trafficSources: [
    //       { source: "Organic Search", sessions: 6412 },
    //       { source: "Direct", sessions: 4275 },
    //       { source: "Social", sessions: 2137 },
    //       { source: "Referral", sessions: 1426 }
    //     ],
    //     topProducts: [
    //       { productId: "p1", name: "Modern Velvet Sofa", unitsSold: 42, revenue: 37758, stockStatus: "in_stock" },
    //       { productId: "p2", name: "Oak Dining Table", unitsSold: 28, revenue: 16772, stockStatus: "low_stock" },
    //       { productId: "p3", name: "Ergonomic Office Chair", unitsSold: 115, revenue: 28635, stockStatus: "in_stock" },
    //       { productId: "p4", name: "Geometric Rug", unitsSold: 89, revenue: 8811, stockStatus: "out_of_stock" }
    //     ],
    //     recentOrders: [
    //       { orderId: "ORD-9021", customerName: "Sarah Jenkins", total: 1299.00, status: "processing", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    //       { orderId: "ORD-9020", customerName: "Marcus Thorne", total: 85.50, status: "completed", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    //       { orderId: "ORD-9019", customerName: "Guest User", total: 450.00, status: "pending", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    //       { orderId: "ORD-9018", customerName: "Emily Chen", total: 2100.00, status: "cancelled", timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString() }
    //     ]
    //   });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="h-8 w-64 bg-slate-200 rounded-md"></div>
              <div className="h-4 w-96 bg-slate-200 rounded-md mt-2"></div>
            </div>
            <div className="h-10 w-36 bg-slate-200 rounded-lg mt-4 md:mt-0"></div>
          </div>

          {/* KPI Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                  <div className="h-4 w-24 bg-slate-200 rounded"></div>
                  <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
                </div>
                <div>
                  <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 w-40 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Layout Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 lg:col-span-2 h-80">
              <div className="h-6 w-40 bg-slate-200 rounded mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-full bg-slate-50 rounded"></div>)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-100 h-80">
              <div className="h-6 w-32 bg-slate-200 rounded mb-6"></div>
              <div className="space-y-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between"><div className="h-4 w-20 bg-slate-200 rounded"></div><div className="h-4 w-8 bg-slate-200 rounded"></div></div>
                    <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Dashboard Unavailable</h2>
          <p className="text-slate-500 mb-6 text-sm">
            We couldn't connect to the backend to fetch your analytics. <br className="hidden md:block"/>
            <span className="font-mono bg-slate-50 text-red-600 px-2 py-1 rounded mt-2 inline-block text-xs">{error}</span>
          </p>
          <button 
            onClick={() => fetchDashboardData(true)}
            disabled={isRetrying}
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70"
          >
            {isRetrying ? (
              <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, trafficSources, topProducts, recentOrders } = data;
  const totalSessions = trafficSources.reduce((acc, curr) => acc + curr.sessions, 0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-slate-500 text-sm mt-1">Here is what's happening in your marketplace today.</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
             {/* <button 
                onClick={() => fetchDashboardData(true)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center"
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                Refresh
              </button> */}
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
              Download Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <KpiCard 
            title="Daily Visitors" 
            value={kpis.dailyVisitors.value.toLocaleString()} 
            trend={kpis.dailyVisitors.trendPercentage} 
            isPositive={kpis.dailyVisitors.isPositive} 
            icon={<Users className="w-5 h-5 text-indigo-600" />} 
          />
          <KpiCard 
            title="Conversion Rate" 
            value={`${kpis.conversionRate.value}%`} 
            trend={kpis.conversionRate.trendPercentage} 
            isPositive={kpis.conversionRate.isPositive} 
            icon={<Activity className="w-5 h-5 text-emerald-600" />} 
          />
          <KpiCard 
            title="Gross Merchandise Value" 
            value={`$${kpis.gmv.value.toLocaleString()}`} 
            trend={kpis.gmv.trendPercentage} 
            isPositive={kpis.gmv.isPositive} 
            icon={<DollarSign className="w-5 h-5 text-blue-600" />} 
          />
          <KpiCard 
            title="Cart Abandonment" 
            value={`${kpis.cartAbandonment.value}%`} 
            trend={kpis.cartAbandonment.trendPercentage} 
            isPositive={kpis.cartAbandonment.isPositive} 
            icon={<ShoppingCart className="w-5 h-5 text-orange-600" />} 
            reverseColors={true} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Recent Orders</h2>
              <button className="text-indigo-600 text-sm font-medium hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 text-indigo-600 font-medium">{order.orderId}</td>
                      <td className="py-3 text-slate-700">{order.customerName}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-slate-900">${order.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Traffic Sources</h2>
            <div className="space-y-4">
              {trafficSources.map((source, idx) => {
                const percentage = totalSessions > 0 ? Math.round((source.sessions / totalSessions) * 100) : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium">{source.source}</span>
                      <span className="text-slate-500">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Selling Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-medium">Product Name</th>
                  <th className="pb-3 font-medium">Units Sold</th>
                  <th className="pb-3 font-medium text-right">Revenue Generated</th>
                  <th className="pb-3 font-medium text-right">Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.map((product) => (
                  <tr key={product.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-medium text-slate-700">{product.name}</span>
                    </td>
                    <td className="py-3 text-slate-600">{product.unitsSold} units</td>
                    <td className="py-3 text-right font-medium text-slate-900">${product.revenue.toLocaleString()}</td>
                    <td className="py-3 text-right">
                      {product.stockStatus === 'in_stock' ? (
                        <span className="text-green-600 flex items-center justify-end text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> In Stock
                        </span>
                      ) : product.stockStatus === 'low_stock' ? (
                        <span className="text-orange-500 flex items-center justify-end text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Low Stock
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center justify-end text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Out of Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, isPositive, icon, reverseColors = false }) {
  const isGood = reverseColors ? !isPositive : isPositive;
  
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <div className="p-2 bg-slate-50 rounded-lg">
          {icon}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{value}</h2>
        <div className="flex items-center text-sm">
          {isPositive ? (
            <TrendingUp className={`w-4 h-4 mr-1 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 mr-1 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
          )}
          <span className={`font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend)}%
          </span>
          <span className="text-slate-400 ml-1">vs last week</span>
        </div>
      </div>
    </div>
  );
}