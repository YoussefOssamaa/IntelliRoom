import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../config/axios.config";
import { dummyMarketplaceData } from "./dummyData";
import MarketHeader from "./MarketHeader";
import Footer from "../../components/common/Footer";
import ShopByRoom from "./ShopByRoom";
import Header from "../dashboard/Header";
import ShopByCategory from "./ShopByCategory";
import SpecialOffers from "./SpecialOffers";
import NewAndFeatured from "./NewAndFeatured";
import ProductFilter from "./ProductFilter";




const MarketplacePage = () => {

  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStyle, setSelectedStyle] = useState("All"); // Still used by the Top Row!
  const [priceRange, setPriceRange] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Recommended');
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  

  const filteredProducts = dummyMarketplaceData.filter((product) => {
    // 1. Category Match
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;

    // 2. Style Match 
    const matchesStyle =
      selectedStyle === "All" || product.aiStyleTags.includes(selectedStyle);

    // 3. Stock Match
    const matchesStock = inStockOnly
      ? product.inventory.inStock === true
      : true;

    // 4. Price Match
    let matchesPrice = true;
    if (priceRange === "Under $100") matchesPrice = product.currentPrice < 100;
    if (priceRange === "$100 - $500")
      matchesPrice = product.currentPrice >= 100 && product.currentPrice <= 500;
    if (priceRange === "Over $500") matchesPrice = product.currentPrice > 500;

    // Return true ONLY if all four conditions are met
    return matchesCategory && matchesStyle && matchesStock && matchesPrice;
  });

  // Unique lists for the sidebar menus
  const categories = ["All", "Seating", "Lighting", "Tables", "Decor"];
  const priceRanges = ["All", "Under $100", "$100 - $500", "Over $500"];

  const aestheticCards = [
    {
      name: "Minimalist",
      image:
        "https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=300&q=80",
    },
    {
      name: "Mid-Century Modern",
      image:
        "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=300&q=80",
    },
    {
      name: "Cyberpunk",
      image:
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=300&q=80",
    },
    {
      name: "Industrial",
      image:
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80",
    },
    {
      name: "Bohemian",
      image:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=300&q=80",
    },
  ];

  // Unique lists for the sidebar buttons

  const aiStyles = [
    "All",
    "Minimalist",
    "Mid-Century Modern",
    "Cyberpunk",
    "Industrial",
    "Bohemian",
  ];
  //user data

  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: "User.",
    plan: "Not available",
    designsUsed: 12, // Keeping hardcoded for now
    designsLimit: 20, // Keeping hardcoded for now
    credits: 0,
  });
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        //delay
        // await new Promise((resolve) => setTimeout(resolve, 4000));
        const response = await axios.get("/dashboard", {
          withCredentials: true,
        });
        if (response.data && response.data.user_name) {
          const dbUser = response.data;
          setUserData((prevState) => ({
            ...prevState,
            name: dbUser.user_name,
            plan: dbUser.plan
              ? dbUser.plan.charAt(0).toUpperCase() + dbUser.plan.slice(1)
              : "Free",
            credits: dbUser.credits,
            profilePicture: dbUser.profilePicture || null,
            initial: (dbUser.firstName || dbUser.user_name)
              .charAt(0)
              .toUpperCase(),
          }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchUserData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans">

      <div className="relative w-full h-[450px] bg-[#f8f9fa] overflow-hidden flex items-center">
        {/* 1. Left-Aligned Fading Image */}
        <div className="absolute inset-y-0 left-0 w-[60%]">
          <img
            src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80"
            alt="Calming interior design"
            className="w-full h-full object-cover !rounded-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f8f9fa]/80 to-[#f8f9fa]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa]/50 to-transparent w-1/2"></div>
        </div>

        {/* 2. Content Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-between">
          <div className="max-w-lg pr-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Design first. Shop second.
            </h2>
            <p className="text-lg text-gray-700 font-medium">
              Generate your perfect space with AI, then find the exact furniture
              to bring your vision home.
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate("/")}
              className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              Start AI Designing
            </button>
          </div>
        </div>
      </div>

      <ShopByRoom />

      <SpecialOffers />

      <ShopByCategory />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
            Shop by Aesthetic
          </h3>
          {selectedStyle !== "All" && (
            <button
              onClick={() => setSelectedStyle("All")}
              className="text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* The Horizontal Scrollable List */}
        <div
          className="flex gap-4 sm:gap-8 md:justify-between overflow-x-auto pb-6 scrollbar-hide w-full"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {aestheticCards.map((style) => (
            <button
              key={style.name}
              onClick={() => setSelectedStyle(style.name)}
              className="flex flex-col items-center group min-w-[120px] focus:outline-none"
            >
              {/* The Image Circle */}
              <div
                className={`w-28 h-28 rounded-full overflow-hidden mb-4 border-4 transition-all duration-300 ${selectedStyle === style.name
                  ? "border-sky-500 shadow-lg scale-105"
                  : "border-transparent group-hover:border-gray-200"
                  }`}
              >
                <img
                  src={style.image}
                  alt={style.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>

              {/* The Label */}
              <span
                className={`text-sm transition-colors ${selectedStyle === style.name
                  ? "text-sky-600 font-extrabold"
                  : "text-gray-700 font-medium group-hover:text-gray-900"
                  }`}
              >
                {style.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* product grid */}
        <main className="flex-1">
          {/* Results Count */}
          <div className="mb-6 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Showing {filteredProducts.length} items
            </span>
          </div>

          {/* The Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <p className="text-gray-500">
                No products found for this combination.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedStyle("All");
                }}
                className="mt-4 text-sky-500 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Map over filtered products to create cards */}
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className="group flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Product Image */}
                  <div className="h-64 w-full bg-gray-50 overflow-hidden relative">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Out of Stock Badge */}
                    {!product.inventory.inStock && (
                      <div className="absolute top-3 right-3 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                        Out of Stock
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Tags */}
                    <div className="flex gap-2 flex-wrap mb-3">
                      {product.aiStyleTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title & Price */}
                    <h3 className="font-bold text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-lg font-medium text-sky-600 mb-4">
                      ${product.currentPrice.toFixed(2)}
                    </p>

                    {/* Buy Button pushes to the bottom */}
                    <div className="mt-auto pt-4 border-t border-gray-50">
                      <button
                        disabled={!product.inventory.inStock}
                        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${product.inventory.inStock
                          ? "bg-gray-900 text-white hover:bg-gray-800"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        {product.inventory.inStock
                          ? "Add to Cart"
                          : "Unavailable"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <NewAndFeatured />

      <Footer />
    </div>
  );
};

export default MarketplacePage;
