import React, { useState, useEffect } from "react";
import axios from "../../../config/axios.config";
import SearchInput from "../../../components/common/SearchInput";
import toast, { Toaster } from "react-hot-toast";

const AdminOrdersPage = () => {
  // --- DATA STATE ---
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  
  // --- FILTER & PAGINATION STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({ totalOrders: 0, totalPages: 1 });

  // --- TRACKING FORM STATE ---
  const [shippingForm, setShippingForm] = useState({ activeOrderId: null, trackingNumber: "", shippingCarrier: "" });

  // 1. Debounce Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Fetch Orders (Triggered when filters or pagination change)
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get("/order/admin/all", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            status: statusFilter,
            search: debouncedSearch,
          },
        });
        
        setOrders(response.data.data || []);
        if (response.data.pagination) setPaginationInfo(response.data.pagination);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        toast.error("Failed to load orders.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, itemsPerPage, statusFilter, debouncedSearch]);

  // --- HANDLERS ---
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  
  const handleStatusUpdate = async (orderId, newStatus) => {
    // If selecting 'shipped', open the tracking form instead of submitting immediately
    if (newStatus === "shipped" && shippingForm.activeOrderId !== orderId) {
      setShippingForm({ activeOrderId: orderId, trackingNumber: "", shippingCarrier: "" });
      return;
    }

    // Prepare payload
    const payload = { status: newStatus };
    if (newStatus === "shipped") {
      if (!shippingForm.trackingNumber || !shippingForm.shippingCarrier) {
        return toast.error("Tracking number and carrier are required.");
      }
      payload.trackingNumber = shippingForm.trackingNumber;
      payload.shippingCarrier = shippingForm.shippingCarrier;
    }

    try {
      const response = await axios.put(`/order/admin/${orderId}/status`, payload);
      
      // Update local state to reflect changes instantly
      setOrders((prev) => prev.map((o) => o._id === orderId ? response.data.data : o));
      setShippingForm({ activeOrderId: null, trackingNumber: "", shippingCarrier: "" });
      toast.success(`Order marked as ${newStatus}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order status.");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    
    try {
      await axios.put(`/order/${orderId}/cancel`);
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: "cancelled" } : o));
      toast.success("Order cancelled successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to cancel order.");
    }
  };

  // --- UI HELPERS ---
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "paid": return "bg-blue-100 text-blue-800 border-blue-200";
      case "processing": return "bg-purple-100 text-purple-800 border-purple-200";
      case "shipped": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "delivered": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">Orders Management</h1>
          <p className="text-gray-600 mt-1">Monitor, update, and fulfill customer orders</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-semibold text-gray-600">
          Total Orders: <span className="text-text-accent text-lg ml-2">{paginationInfo.totalOrders}</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-6">
            <SearchInput
              placeholder="Search by Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-text-accent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-text-accent"
            >
              <option value={5}>55 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-text-accent"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
               <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
               </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <React.Fragment key={order._id}>
                    {/* PRIMARY ROW */}
                    <tr className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{order._id.slice(-8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{order.user?.name || "Guest"}</span>
                          <span className="text-xs text-gray-500">{order.user?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-text-accent">${(order.totalPrice || 0).toFixed(2)}</span>
                          <span className="text-xs text-gray-500">{order.items?.length || 0} items</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(order.status)}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                          className="text-text-accent hover:text-green-700 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {expandedOrderId === order._id ? "Close" : "Manage"}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED DETAILS ROW */}
                    {expandedOrderId === order._id && (
                      <tr className="bg-[#f8fafc] border-b-2 border-gray-200">
                        <td colSpan="6" className="px-6 py-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* COLUMN 1: Shipping & Customer Info */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Shipping Details</h4>
                              <p className="font-bold text-gray-900 text-sm">{order.user?.name}</p>
                              <p className="text-sm text-gray-600 mt-1">{order.shippingAddress?.street}</p>
                              <p className="text-sm text-gray-600">{order.shippingAddress?.city}, {order.shippingAddress?.zipCode}</p>
                              <p className="text-sm text-gray-600 mt-2 font-medium">📞 {order.shippingAddress?.phone}</p>
                              
                              <h4 className="text-xs font-bold text-gray-400 uppercase mt-5 mb-2 tracking-wider">Payment</h4>
                              <p className="text-sm text-gray-900">Method: <span className="font-semibold">{order.paymentMethod}</span></p>
                              <p className="text-sm text-gray-900 mt-1">
                                Status: <span className={`font-bold ${order.isPaid ? 'text-green-600' : 'text-red-500'}`}>{order.isPaid ? 'PAID' : 'PENDING'}</span>
                              </p>
                            </div>

                            {/* COLUMN 2: Order Items */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-1">
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Order Items</h4>
                              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {order.items?.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm text-gray-900 line-clamp-1">{item.product?.name || "Product"}</span>
                                      <span className="text-xs text-gray-500">Qty: {item.quantity} × ${(item.priceAtAdd || 0).toFixed(2)}</span>
                                    </div>
                                    <span className="font-bold text-text-accent text-sm">
                                      ${((item.priceAtAdd || 0) * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* COLUMN 3: Admin Actions */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Update Status</h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {["pending", "processing", "shipped", "delivered"].map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusUpdate(order._id, status)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                        order.status === status
                                          ? "bg-text-accent text-white shadow-md ring-2 ring-green-200"
                                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                      }`}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>

                                {/* Dynamic Tracking Form (Shows only if 'Shipped' is clicked) */}
                                {shippingForm.activeOrderId === order._id && (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 animate-fadeIn">
                                    <h5 className="text-xs font-bold text-blue-800 mb-2">Enter Tracking Info</h5>
                                    <input 
                                      type="text" placeholder="Carrier (e.g. FedEx)" 
                                      className="w-full text-sm px-3 py-1.5 mb-2 rounded border border-blue-200 focus:ring-1 focus:ring-blue-500"
                                      value={shippingForm.shippingCarrier} onChange={(e) => setShippingForm({...shippingForm, shippingCarrier: e.target.value})}
                                    />
                                    <input 
                                      type="text" placeholder="Tracking Number" 
                                      className="w-full text-sm px-3 py-1.5 mb-3 rounded border border-blue-200 focus:ring-1 focus:ring-blue-500"
                                      value={shippingForm.trackingNumber} onChange={(e) => setShippingForm({...shippingForm, trackingNumber: e.target.value})}
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => handleStatusUpdate(order._id, "shipped")} className="flex-1 bg-blue-600 text-white text-xs font-bold py-1.5 rounded hover:bg-blue-700">Confirm Shipment</button>
                                      <button onClick={() => setShippingForm({activeOrderId: null, trackingNumber: "", shippingCarrier: ""})} className="px-3 bg-white text-gray-500 text-xs font-bold py-1.5 rounded border hover:bg-gray-50">Cancel</button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Danger Zone */}
                              {order.status !== "cancelled" && order.status !== "delivered" && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <button
                                    onClick={() => handleCancelOrder(order._id)}
                                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-sm py-2 rounded-lg transition-colors border border-red-100"
                                  >
                                    Cancel Order
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      {paginationInfo.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-xl shadow-sm">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <div className="flex gap-1">
            {Array.from({ length: paginationInfo.totalPages }, (_, idx) => idx + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                  currentPage === page ? "bg-text-accent text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === paginationInfo.totalPages}
            className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;