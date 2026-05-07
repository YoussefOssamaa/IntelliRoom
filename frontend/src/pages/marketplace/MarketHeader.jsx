import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import logoImage from "../../../public/assets/site-logo-white.png";

const MarketHeader = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();

  // Pulled user directly from the global brain
  const { user, cart, favorites } = useShop();

  // 🚀 NEW: Calculate the true total of all items in the cart
  const totalCartItems = cart.reduce(
    (total, item) => total + (item.cartQuantity || 1),
    0,
  );

  const getLinkClass = (path) => {
    return location.pathname === path
      ? "text-sm font-bold text-text-accent transition-colors whitespace-nowrap"
      : "text-sm font-medium text-text-primary hover:text-text-accent transition-colors whitespace-nowrap";
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    setShowProfileMenu(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-[#e0e0e0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 w-full">
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 cursor-pointer shrink-0"
            >
              <img
                src={logoImage}
                alt="IntelliRoom AI Logo"
                className="h-10 sm:h-12 w-auto object-contain"
              />
              <span className="hidden sm:block text-xl font-bold text-text-primary tracking-wide leading-none whitespace-nowrap">
                IntelliRoom <span className="text-text-accent">AI</span>
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-4 border-l border-gray-200 pl-4 shrink-0">
              <Link to="/ecomm" className={getLinkClass("/")}>
                Home
              </Link>
              <Link to="/dashboard" className={getLinkClass("/dashboard")}>
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="w-full flex-grow max-w-3xl lg:px-8 mt-4 lg:mt-0">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products, styles, or AI designs..."
                className="w-full pl-12 pr-4 py-2.5 border border-[#e0e0e0] rounded-full text-sm focus:outline-none focus:border-text-accent focus:ring-1 focus:ring-text-accent transition-all bg-[#f9fafb] shadow-sm"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-end gap-5 shrink-0 mt-4 lg:mt-0">
            {/* 1. Favorites Icon */}
            <Link
              to="/ecomm/wishlist"
              className="relative text-gray-600 hover:text-red-500 transition-colors p-1"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* 2. Cart Icon */}
            <Link
              to="/ecomm/cart"
              className="relative text-gray-600 hover:text-blue-500 transition-colors p-1 group"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {/* 🚀 Using the new totalCartItems variable! */}
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-blue-500 rounded-full border-2 border-white group-hover:scale-110 transition-transform">
                  {totalCartItems}
                </span>
              )}
            </Link>

            {/* 3. User Profile  */}
            {user ? (
              <div className="relative pl-2 border-l border-gray-200">
                <button
                  className="flex items-center gap-2 focus:outline-none bg-transparent border-0 cursor-pointer"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-text-accent overflow-hidden hover:shadow-md transition-shadow">
                    {user?.profile_picture_url ? (
                      <img
                        src={user.profile_picture_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#f0fdf4] flex items-center justify-center text-text-accent font-bold text-lg">
                        {user?.user_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e0e0e0] rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e0e0e0] bg-gray-50">
                      <p className="text-sm font-semibold text-[#333333]">
                        {user?.user_name || "User"}
                      </p>
                      <p className="text-xs text-[#666666] truncate">
                        {user?.plan || "free"} Plan
                      </p>
                    </div>
                    <ul className="py-2">
                      <li>
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-sm text-[#333333] hover:bg-gray-50 transition-colors"
                        >
                          Dashboard
                        </Link>
                      </li>
                      <li>
                        <button className="w-full text-left px-4 py-2 text-sm text-[#333333] hover:bg-gray-50 transition-colors">
                          Settings
                        </button>
                      </li>
                      <li className="border-t border-[#e0e0e0] mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Sign Out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                <Link
                  to="/login"
                  className="btn-secondary"
                  style={{ padding: "10px 26px" }}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary"
                  style={{ padding: "10px 24px" }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MarketHeader;
