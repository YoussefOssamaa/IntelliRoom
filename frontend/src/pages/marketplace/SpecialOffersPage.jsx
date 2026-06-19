import React, { useState, useEffect } from "react";
import axios from "../../config/axios.config";
import ProductCard from "./ProductCard"; 

const SpecialOffersPage = () => {
  const [saleItems, setSaleItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get("/products?onSale=true");
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 border-b border-gray-200 pb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4 flex items-center gap-3">
            {/* <span className="text-red-500">🔥</span> */}
             Clearance & Special Offers
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Upgrade your space for less. Shop our curated selection of
            discounted furniture and decor before they are gone.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((skeleton) => (
              <div
                key={skeleton}
                className="w-full aspect-[4/5] bg-gray-200 animate-pulse rounded-2xl"
              ></div>
            ))}
          </div>
        ) : saleItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900">
              No active sales right now!
            </h3>
            <p className="text-gray-500 mt-2">
              Check back later for new markdowns.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {saleItems.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialOffersPage;
