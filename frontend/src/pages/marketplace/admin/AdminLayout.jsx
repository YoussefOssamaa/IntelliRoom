import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f9fafb] flex">
      {/* Mobile Sidebar Overlay (Darkens background on small screens) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* The Fixed Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-white w-64 border-r border-[#e0e0e0] z-30 transform transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Branding */}
        <div className="h-16 flex items-center justify-center border-b border-[#e0e0e0] flex-shrink-0">
          <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">
            IntelliRoom <span className="text-text-accent">Admin</span>
          </h3>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-2 flex-grow overflow-y-auto">
          {/* Dashboard */}
          <Link
            to="/ecomm/admin"
            className={`block px-4 py-3 rounded-xl font-bold transition-all ${location.pathname === "/ecomm/admin" ? "bg-text-accent text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Dashboard Overview
          </Link>

          {/* Products Dropdown Menu */}
          <div>
            <button
              onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
            >
              <span>Product Inventory</span>
              <svg
                className={`w-4 h-4 transform transition-transform ${isProductsDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Links */}
            {isProductsDropdownOpen && (
              <div className="pl-4 mt-1 space-y-1">
                <Link
                  to="/ecomm/admin/products/list"
                  className={`block px-4 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === "/ecomm/admin/products/list" ? "bg-green-50 text-text-accent" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Table List View
                </Link>

                <Link
                  to="/ecomm/admin/products/grid"
                  className={`block px-4 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === "/ecomm/admin/products/grid" ? "bg-green-50 text-text-accent" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Visual Grid View
                </Link>

                <Link
                  to="/ecomm/admin/products/create"
                  className={`block px-4 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === "/ecomm/admin/products/create" ? "bg-green-50 text-text-accent" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Add New Product
                </Link>

                <Link
                  to="/ecomm/admin/products/edit"
                  className={`block px-4 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname.includes("/ecomm/admin/products/edit") ? "bg-green-50 text-text-accent" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Edit Product
                </Link>
              </div>
            )}
          </div>

          {/* Categories Dropdown Wrapper */}
          <div className="flex flex-col">
            {/* Main Category Button */}
            <button
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${
                isCategoriesOpen
                  ? "bg-gray-50 text-text-accent"
                  : "text-gray-700 hover:bg-gray-50 hover:text-text-accent"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Folder/Category Icon */}
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                Categories
              </div>
              {/* Chevron Arrow (Animates when opened) */}
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isCategoriesOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Links */}
            {isCategoriesOpen && (
              <div className="mt-1 ml-5 pl-4 border-l-2 border-[#e0e0e0] flex flex-col gap-1 animate-fade-in-down">
                <Link
                  to="/ecomm/admin/categories/list"
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-text-accent hover:bg-gray-50 rounded-lg transition-colors"
                >
                  All Categories
                </Link>
                <Link
                  to="/ecomm/admin/categories/create"
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-text-accent hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Create Category
                </Link>
                {/* 🚀 Routing to /edit without an ID will perfectly trigger our new Search Hub! */}
                <Link
                  to="/ecomm/admin/categories/edit"
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-text-accent hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Edit Category
                </Link>
              </div>
            )}
          </div>

          {/* 🚀 NEW: Rooms */}
          <Link
            to="/ecomm/admin/rooms"
            className={`block px-4 py-3 rounded-xl font-bold transition-all ${location.pathname.includes("/ecomm/admin/rooms") ? "bg-text-accent text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Manage Rooms
          </Link>

          {/* Orders */}
          <Link
            to="/ecomm/admin/orders"
            className={`block px-4 py-3 rounded-xl font-bold transition-all ${location.pathname.includes("/ecomm/admin/orders") ? "bg-text-accent text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Orders
          </Link>
        </nav>

        {/* Bottom Exit Button */}
        <div className="p-4 border-t border-[#e0e0e0] flex-shrink-0">
          <button
            onClick={() => navigate("/ecomm")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            &larr; Exit to Store
          </button>
        </div>
      </aside>

      {/* Main Content Area (Right Side) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#e0e0e0] flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm relative z-10 flex-shrink-0">
          {/* Hamburger Menu (Mobile Only) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Admin Profile Mockup */}
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-text-accent flex items-center justify-center text-white font-bold shadow-sm">
                A
              </div>
              <span className="text-sm font-bold text-text-primary hidden sm:block">
                System Admin
              </span>
            </div>
          </div>
        </header>

        {/* THE OUTLET*/}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f9fafb] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
