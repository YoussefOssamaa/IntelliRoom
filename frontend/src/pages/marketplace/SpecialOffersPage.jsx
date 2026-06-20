import React, { useState, useEffect } from "react";
import axios from "../../config/axios.config";
import ProductCard from "./ProductCard"; 

const SpecialOffersPage = () => {
  const [saleItems, setSaleItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = saleItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(saleItems.length / itemsPerPage);

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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {currentItems.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-12 space-x-2">
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={currentPage === 1}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 cursor-pointer shadow-sm"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => {
                        setCurrentPage(pageNumber);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-11 h-11 rounded-xl text-sm font-bold transition-all ${
                        currentPage === pageNumber
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={currentPage === totalPages}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 cursor-pointer shadow-sm"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SpecialOffersPage;
