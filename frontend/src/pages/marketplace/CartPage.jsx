import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import Header from "./MarketHeader";

const CartPage = () => {
  const navigate = useNavigate();
  
  // Pull the data and functions from our global brain
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    toggleFavorite,
    favorites,
  } = useShop();

  // Real-time Math Calculations
  const subtotal = cart.reduce(
    (total, item) =>
      total + (item.pricing?.currentPrice || 0) * item.cartQuantity,
    0,
  );
  const shippingThreshold = 1000;
  const shippingCost = subtotal >= shippingThreshold || subtotal === 0 ? 0 : 99;
  const total = subtotal + shippingCost;

  // Gamification progress bar
  const progressPercentage = Math.min(
    (subtotal / shippingThreshold) * 100,
    100,
  );

  const hasInvalidItems = cart.some(
    (item) => !item.pricing?.currentPrice || item.pricing.currentPrice <= 0,
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* <Header /> */}

      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-8">
          Your Cart
        </h1>

        {/* the empty state  */}
        {cart.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[#e0e0e0] text-center shadow-sm flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                ></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Your cart is feeling a little light
            </h2>
            <p className="text-gray-500 mb-8 max-w-md">
              Let's find some incredible pieces to bring your interior design
              vision to life.
            </p>
            <Link
              to="/ecomm"
              className="bg-text-accent text-white font-bold py-3 px-8 rounded-xl shadow-md hover:bg-green-600 hover:shadow-lg transition-all duration-300"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* left column: Product Rows (65%) */}
            <div className="flex-1">
              <div className="flex flex-col gap-6">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white rounded-2xl p-4 sm:p-6 border border-[#e0e0e0] flex flex-col sm:flex-row gap-6 shadow-sm relative group"
                  >
                    {/* Product Image */}
                    <Link
                      to={`/ecomm/product/${item.slug}`}
                      className="w-full sm:w-32 h-32 flex-shrink-0 bg-gray-100 rounded-2xl overflow-hidden border border-[#e0e0e0] relative"
                    >
                      <img
                        src={
                          item?.media?.primaryImage ||
                          "https://via.placeholder.com/150?text=No+Image"
                        }
                        alt={item?.name || "Product"}
                        className="absolute top-0 left-0 w-full h-full object-cover !rounded-none"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <Link to={`/ecomm/product/${item.slug}`}>
                            <h3 className="text-lg font-bold text-text-primary hover:text-text-accent transition-colors line-clamp-1">
                              {item.name}
                            </h3>
                          </Link>
                          <span className="text-lg font-extrabold text-text-primary">
                            $
                            {(
                              (item.pricing?.currentPrice || 0) *
                              (item.cartQuantity || 1)
                            ).toFixed(2)}
                          </span>
                        </div>

                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 mb-1">
                          {item.categorization?.primary?.name || "Furniture"}
                        </div>

                        <p className="text-sm text-gray-500">{item.brand}</p>
                        {item.categorization?.materials && (
                          <p className="text-xs text-gray-400 mt-1">
                            Material: {item.categorization.materials[0]}
                          </p>
                        )}
                      </div>

                      {/* Interactive Controls */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        {/* Quantity Control */}
                        <div className="flex items-center border border-[#e0e0e0] rounded-lg overflow-hidden h-10">
                          <button
                            onClick={() =>
                              updateCartQuantity(
                                item._id,
                                item.cartQuantity - 1,
                              )
                            }
                            disabled={item.cartQuantity <= 1}
                            className="w-10 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M20 12H4"
                              ></path>
                            </svg>
                          </button>
                          <div className="w-10 h-full flex items-center justify-center font-bold text-sm text-text-primary border-x border-[#e0e0e0]">
                            {item.cartQuantity}
                          </div>
                          <button
                            onClick={() =>
                              updateCartQuantity(
                                item._id,
                                item.cartQuantity + 1,
                              )
                            }
                            className="w-10 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                              ></path>
                            </svg>
                          </button>
                        </div>

                        {/* Action Links */}
                        <div className="flex items-center gap-4 text-sm font-bold">
                          <button
                            onClick={() => {
                              toggleFavorite(item);
                              removeFromCart(item._id);
                            }}
                            className="text-gray-400 hover:text-text-accent transition-colors hidden sm:block"
                          >
                            Move to Favorites
                          </button>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              ></path>
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* right column: Order Summary (35%) */}
            <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0">
              <div className="bg-white rounded-3xl border border-[#e0e0e0] p-6 sm:p-8 shadow-sm sticky top-8">
                <h2 className="text-xl font-bold text-text-primary mb-6">
                  Order Summary
                </h2>

                {/* Gamification Free Shipping Bar */}
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {subtotal >= shippingThreshold ? (
                    <p className="text-sm font-bold text-green-600 flex items-center gap-2 mb-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      You've unlocked Free Shipping!
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-text-primary mb-2">
                      You're{" "}
                      <span className="text-text-accent">
                        ${(shippingThreshold - subtotal).toFixed(2)}
                      </span>{" "}
                      away from Free Shipping
                    </p>
                  )}
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-text-accent transition-all duration-700 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Financials */}
                <div className="flex flex-col gap-4 text-sm mb-6 pb-6 border-b border-gray-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-text-primary">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Estimated Shipping</span>
                    <span className="font-bold text-text-primary">
                      {shippingCost === 0
                        ? "FREE"
                        : `$${shippingCost.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Estimated Taxes</span>
                    <span className="text-gray-400">
                      Calculated at checkout
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <span className="text-lg font-bold text-text-primary">
                    Total
                  </span>
                  <span className="text-3xl font-extrabold text-text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!hasInvalidItems && cart.length > 0) {
                      navigate("/ecomm/checkout");
                    }
                  }}
                  disabled={hasInvalidItems || cart.length === 0}
                  className={`w-full font-extrabold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    hasInvalidItems || cart.length === 0
                      ? "bg-gray-400 text-white cursor-not-allowed opacity-80 pointer-events-none"
                      : "bg-text-accent text-white shadow-md hover:bg-green-600 hover:shadow-lg"
                  }`}
                >
                  {hasInvalidItems
                    ? "Cart Contains Invalid Items"
                    : "Proceed to Checkout"}

                  {!hasInvalidItems && cart.length > 0 && (
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
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      ></path>
                    </svg>
                  )}
                </button>

                {/* Trust Badges */}
                <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs font-medium">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                  </svg>
                  Secure Checkout
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;