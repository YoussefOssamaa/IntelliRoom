import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../config/axios.config";

const ShopByCategory = () => {
  const navigate = useNavigate();
  const sliderRef = useRef(null);

  // --- State Management ---
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Fetch Categories from Database ---
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/categories");
        if (response.data.success) {
          
          // 🚀 THE FIX: Filter out subcategories! Only keep items where parentCategory is null
          const primaryCategories = response.data.data.filter(
            (category) => !category.parentCategory
          );
          
          setCategories(primaryCategories);
        }
      } catch (error) {
        console.error(
          "Failed to fetch categories:",
          error.response?.data || error.message,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const slide = (direction) => {
    if (sliderRef.current) {
      const slideAmount = sliderRef.current.clientWidth / 2;
      sliderRef.current.scrollBy({
        left: direction === "left" ? -slideAmount : slideAmount,
        behavior: "smooth",
      });
    }
  };

  // If we finished loading and found absolutely nothing, hide the section
  if (!isLoading && categories.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header & Controls */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Shop by Category
          </h2>
          <p className="mt-2 text-lg text-gray-500">
            Find the perfect piece for your space.
          </p>
        </div>

        {/* Custom Left/Right Navigation Buttons */}
        <div className="hidden md:flex space-x-3">
          <button
            onClick={() => slide("left")}
            className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 transition-all shadow-sm"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </button>
          <button
            onClick={() => slide("right")}
            className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 transition-all shadow-sm"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      {/* The Slider Container */}
      <div
        ref={sliderRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-8"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {isLoading
          ? // Loading Skeletons
            [1, 2, 3, 4].map((skeleton) => (
              <div
                key={skeleton}
                className="min-w-[75%] sm:min-w-[45%] md:min-w-[30%] lg:min-w-[22%] aspect-[4/5] rounded-3xl bg-gray-200 animate-pulse snap-center"
              ></div>
            ))
          : // Actual Database Categories
            categories.map((category) => {
              const imageUrl =
                category.image ||
                "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80";

              return (
                <div
                  key={category._id}
                  className="relative min-w-[75%] sm:min-w-[45%] md:min-w-[30%] lg:min-w-[22%] aspect-[4/5] rounded-3xl overflow-hidden snap-center group cursor-pointer shadow-md hover:shadow-xl transition-shadow"
                  onClick={() => navigate(`/ecomm/category/${category.slug}`)}
                >
                  <img
                    src={imageUrl}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out !rounded-none"
                    style={{ borderRadius: "0px", clipPath: "none" }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/10 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <h3 className="text-2xl font-extrabold text-white tracking-tight mb-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      {category.name}
                    </h3>
                    <p className="text-sm text-sky-300 font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                      Explore Collection
                    </p>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default ShopByCategory;