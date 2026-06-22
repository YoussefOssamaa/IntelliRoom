import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";

import ProductCard from "./ProductCard";
import ProductFilter from "./ProductFilter";
import axios from "../../config/axios.config";

const SearchResultsPage = () => {
  // 1. ROUTER PARAMS - Using useSearchParams instead of useParams
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  // 2. STATE DECLARATIONS
  const [formOptions, setFormOptions] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Recommended");
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  // 3. EFFECTS

  // Fetch Form Options for the Sidebar Filter
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await axios.get("/products/form-options");
        if (response.data.success) {
          setFormOptions(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };
    fetchOptions();
  }, []);

  // Fetch Products based on the search query AND active filters
  useEffect(() => {
    const fetchSearchResults = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();

        // Attach the search query to the backend request
        if (searchQuery) {
          queryParams.append("search", searchQuery);
        }

        queryParams.append("limit", "9999");

        // Attach all active sidebar filters
        if (inStockOnly) queryParams.append("inStockOnly", "true");
        if (sortBy !== "Recommended") queryParams.append("sort", sortBy);
        if (selectedMaterials.length > 0)
          queryParams.append("materials", selectedMaterials.join(","));
        if (selectedColors.length > 0)
          queryParams.append("colors", selectedColors.join(","));
        if (selectedCategories.length > 0)
          queryParams.append("categories", selectedCategories.join(","));

        if (priceRange !== "All") {
          if (priceRange === "Under $100")
            queryParams.append("maxPrice", "100");
          else if (priceRange === "$100 - $500") {
            queryParams.append("minPrice", "100");
            queryParams.append("maxPrice", "500");
          } else if (priceRange === "Over $500")
            queryParams.append("minPrice", "500");
        }

        const response = await axios.get(`/products?${queryParams.toString()}`);
        if (response.data.success) {
          setProducts(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [
    searchQuery,
    selectedCategories,
    inStockOnly,
    selectedMaterials,
    selectedColors,
    sortBy,
    priceRange,
  ]);

  // --- Handlers ---
  const removeCategory = (cat) =>
    setSelectedCategories(selectedCategories.filter((c) => c !== cat));
  const removeMaterial = (material) =>
    setSelectedMaterials(selectedMaterials.filter((m) => m !== material));
  const removeColor = (color) =>
    setSelectedColors(selectedColors.filter((c) => c !== color));

  // --- RENDERS ---

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* HERO SECTION */}
      <div className="bg-white border-b border-[#e0e0e0] pt-8 pb-12 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* <nav className="flex text-sm text-gray-500 mb-6">
            <Link to="/ecomm" className="hover:text-sky-600 transition-colors">
              Marketplace
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-400 capitalize">Search</span>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900">"{searchQuery}"</span>
          </nav> */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Results for "{searchQuery}"
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl">
            {isLoading
              ? "Searching our catalog..."
              : `We found ${products.length} products matching your search.`}
          </p>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* THE SIDEBAR */}
          <div className="w-full lg:w-1/4 lg:sticky lg:top-8 flex-shrink-0 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto pr-2 custom-scrollbar">
            <ProductFilter
              formOptions={formOptions}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              inStockOnly={inStockOnly}
              setInStockOnly={setInStockOnly}
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
              selectedColors={selectedColors}
              setSelectedColors={setSelectedColors}
            />
          </div>

          {/* THE PRODUCT GRID */}
          <div className="w-full lg:w-3/4">
            {/* Active Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCategories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-green-700 border border-[#00e676]/30"
                >
                  {c}{" "}
                  <button
                    onClick={() => removeCategory(c)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {priceRange !== "All" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-green-700 border border-[#00e676]/30">
                  {priceRange}{" "}
                  <button
                    onClick={() => setPriceRange("All")}
                    className="ml-1.5 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-green-700 border border-[#00e676]/30">
                  In Stock{" "}
                  <button
                    onClick={() => setInStockOnly(false)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedMaterials.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-green-700 border border-[#00e676]/30"
                >
                  {m}{" "}
                  <button
                    onClick={() => removeMaterial(m)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {selectedColors.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-green-700 border border-[#00e676]/30"
                >
                  {c}{" "}
                  <button
                    onClick={() => removeColor(c)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {/* Products List / Empty States */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#e0e0e0] text-center shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  No products found
                </h2>
                <p className="text-gray-500 max-w-md mb-6">
                  We couldn't find anything for "{searchQuery}". Try adjusting
                  your filters or searching for something else.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setPriceRange("All");
                    setInStockOnly(false);
                    setSelectedMaterials([]);
                    setSelectedColors([]);
                  }}
                  className="bg-sky-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-sky-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
