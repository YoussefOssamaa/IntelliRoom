import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../config/axios.config";
import ProductCard from "./ProductCard";

const SpecialOffersSection = () => {
  const navigate = useNavigate();
  const [saleItems, setSaleItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get(
          "/products?onSale=true&limit=8&fields=slug,name,pricing,media,categorization",
        );
        const fetchedProducts = response.data.data || response.data;

        if (Array.isArray(fetchedProducts)) {
          setSaleItems(fetchedProducts);
        }
      } catch (error) {
        console.error("Failed to fetch special offers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Special Offers
          </h2>
          <p className="mt-2 text-lg text-gray-500">
            Limited time deals on premium furniture.
          </p>
        </div>

        {/* Only show the "View All" button if there are actually items to view */}
        {saleItems.length > 0 && (
          <button
            onClick={() => navigate("/ecomm/offers")}
            className="hidden md:block text-sky-600 hover:text-sky-700 font-semibold transition-colors"
          >
            View All Offers &rarr;
          </button>
        )}
      </div>

      {/* The Grid OR Empty State */}
      {isLoading ? (
        // Loading Skeletons
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="w-full aspect-[4/5] bg-gray-200 animate-pulse rounded-2xl"
            ></div>
          ))}
        </div>
      ) : saleItems.length === 0 ? (
        <div className="w-full py-16 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <svg
            className="w-16 h-16 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            ></path>
          </svg>
          <h3 className="text-xl font-bold text-gray-900">No Active Sales</h3>
          <p className="text-gray-500 mt-2 text-center max-w-md">
            We are currently refreshing our inventory. Check back soon for
            exclusive discounts and seasonal markdowns!
          </p>
        </div>
      ) : (
        // Actual Database Products
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {saleItems.slice(0, 8).map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {/* Mobile View All Button - Also hidden if empty */}
      {saleItems.length > 0 && (
        <button
          onClick={() => navigate("/ecomm/offers")}
          className="md:hidden mt-8 w-full py-3 bg-white text-sky-600 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 shadow-sm"
        >
          View All Offers
        </button>
      )}
    </div>
  );
};

export default SpecialOffersSection;
