import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import axios from "../../config/axios.config";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart } = useShop();

  // --- Form State ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    cardNumber: "",
    expDate: "",
    cvc: "",
    nameOnCard: "",
  });

  // --- Real-time Math Calculations ---
  const subtotal = cart.reduce(
    (total, item) =>
      total + (item.pricing?.currentPrice || 0) * item.cartQuantity,
    0,
  );
  const shippingThreshold = 1000;
  const shippingCost = subtotal >= shippingThreshold || subtotal === 0 ? 0 : 99;
  const total = subtotal + shippingCost;

  // 🚀 THE FIX: Security Check - In case they bypassed the cart page via URL
  const hasInvalidItems = cart.some(
    (item) => !item.pricing?.currentPrice || item.pricing.currentPrice <= 0,
  );

  // --- Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      /*  AXIOS TEMPLATE: Uncomment this when your backend is ready!
      const orderPayload = {
        customerDetails: formData,
        cartItems: cart.map(item => ({ productId: item._id, quantity: item.cartQuantity })),
        totalAmount: total
      };
      
      const response = await axios.post('/orders/create', orderPayload);
      if (response.data.success) {
          navigate("/ecomm/order-success");
      }
      */

      // Simulating a network request for the payment gateway for now
      setTimeout(() => {
        setIsProcessing(false);
        navigate("/ecomm/order-success");
      }, 2000);

    } catch (error) {
      console.error("Checkout failed:", error);
      setIsProcessing(false);
      // You could set an error state here to show a toast/alert to the user!
    }
  };

  // 🚀 THE FIX: Kick them out if the cart is empty OR contains a broken $0 item
  if (cart.length === 0 || hasInvalidItems) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#f9fafb]">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {hasInvalidItems ? "Security Alert: Invalid Cart Items" : "Your cart is empty!"}
        </h2>
        <p className="text-gray-500 mb-6 text-center max-w-md">
            {hasInvalidItems 
              ? "We detected a pricing error with an item in your cart. Please clear your cart and try again." 
              : "You need to add items to your cart before you can checkout."}
        </p>
        <button
          onClick={() => navigate("/ecomm")}
          className="text-text-accent hover:underline font-bold"
        >
          &larr; Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav className="flex text-sm text-gray-500 mb-8 font-medium">
          <Link
            to="/ecomm"
            className="hover:text-text-accent transition-colors"
          >
            Marketplace
          </Link>
          <span className="mx-2">/</span>
          <Link
            to="/ecomm/cart"
            className="hover:text-text-accent transition-colors"
          >
            Cart
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text-primary font-bold">Checkout</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-8">
          Checkout
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* LEFT COLUMN: Checkout Forms (65%) */}
          <div className="flex-1">
            <form onSubmit={handleCheckout} className="flex flex-col gap-8">
              {/* 1. Contact Information */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e0e0] shadow-sm">
                <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-[#e0e0e0] pb-4">
                  Contact Information
                </h2>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* 2. Shipping Address */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e0e0] shadow-sm">
                <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-[#e0e0e0] pb-4">
                  Shipping Address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                    placeholder="123 Design Avenue"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      required
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Payment Details */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e0e0] shadow-sm mb-4">
                <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-[#e0e0e0] pb-4">
                  Payment Details
                </h2>

                {/* Simulated Credit Card Input */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cardNumber"
                      required
                      maxLength="19"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="0000 0000 0000 0000"
                      className="w-full pl-12 pr-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb] font-mono"
                    />
                    <svg
                      className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Expiration Date
                    </label>
                    <input
                      type="text"
                      name="expDate"
                      required
                      placeholder="MM/YY"
                      maxLength="5"
                      value={formData.expDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      CVC
                    </label>
                    <input
                      type="text"
                      name="cvc"
                      required
                      placeholder="123"
                      maxLength="4"
                      value={formData.cvc}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb] font-mono"
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    name="nameOnCard"
                    required
                    value={formData.nameOnCard}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent focus:border-text-accent outline-none transition-colors bg-[#f9fafb]"
                  />
                </div>
              </div>

              {/* Hidden submit button triggered by the right-column button */}
              <button type="submit" id="checkout-submit" className="hidden">
                Submit
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: Order Summary (35%) */}
          <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0">
            <div className="bg-white rounded-3xl border border-[#e0e0e0] p-6 sm:p-8 shadow-sm sticky top-8">
              <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-[#e0e0e0] pb-4">
                Order Summary
              </h2>

              {/* Mini Item List */}
              <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-gray-100 max-h-60 overflow-y-auto scrollbar-hide">
                {cart.map((item) => (
                  <div key={item._id} className="flex gap-4 items-center">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 !rounded-none overflow-hidden border border-[#e0e0e0] relative">
                      <img
                        src={
                          item?.media?.primaryImage ||
                          "https://via.placeholder.com/150"
                        }
                        alt={item?.name || "Product"}
                        className="absolute top-0 left-0 w-full h-full object-cover !rounded-none"
                      />
                      {/* Quantity Badge */}
                      <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {item.cartQuantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-text-primary truncate">
                        {item?.name}
                      </h4>
                      {/* 🚀 THE FIX: Displaying the category right here in the mini-cart */}
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 mb-0.5">
                        {item.categorization?.primary?.name || "Furniture"}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {item?.brand}
                      </p>
                    </div>
                    <div className="text-sm font-extrabold text-text-primary">
                      $
                      {((item.pricing?.currentPrice || 0) * item.cartQuantity).toFixed(
                        2,
                      )}
                    </div>
                  </div>
                ))}
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
                  <span>Shipping</span>
                  <span className="font-bold text-text-primary">
                    {shippingCost === 0
                      ? "FREE"
                      : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Taxes</span>
                  <span className="text-gray-400">Calculated later</span>
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

              {/* Trigger the form submit button */}
              <button
                onClick={() =>
                  document.getElementById("checkout-submit").click()
                }
                disabled={isProcessing}
                className="w-full bg-text-accent text-white font-extrabold py-4 rounded-xl shadow-md hover:bg-green-600 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      ></path>
                    </svg>
                    Pay ${total.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;