import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductCard from "./ProductCard";
import ProductFilter from "./ProductFilter";
import axios from "../../config/axios.config";
import { aesthetics } from "./aestheticData"; // Pull in our design data!

const AestheticPage = () => {
  const { aestheticId } = useParams();
  const navigate = useNavigate();

  // Find the exact aesthetic object from our data file to get the pretty title & subtitle
  const activeAesthetic = aesthetics.find((a) => a.tag === aestheticId);

  // --- STATE ---
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

  useEffect(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" 
      });
    }, [aestheticId]);

  // Safety Check: If the user types a random aesthetic in the URL, send them back
  useEffect(() => {
    if (!activeAesthetic) {
      navigate("/ecomm");
    }
    // Clear categories when navigating to a new aesthetic page
    setSelectedCategories([]);
  }, [aestheticId, activeAesthetic, navigate]);

  // 1. Fetch Form Options (Colors, Materials, Categories) Once on Mount
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

  // 2. Fetch Products whenever filters or the aesthetic changes
  useEffect(() => {
    // Prevent fetching if it's an invalid URL
    if (!activeAesthetic) return;

    const fetchAestheticProducts = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();

        queryParams.append("tags", aestheticId);

        // Standard Filters
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
        console.error("Failed to fetch aesthetic products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAestheticProducts();
  }, [
    aestheticId,
    activeAesthetic,
    selectedCategories,
    inStockOnly,
    selectedMaterials,
    selectedColors,
    sortBy,
    priceRange,
  ]);

  // --- Handlers for active pill removal ---
  const removeCategory = (category) =>
    setSelectedCategories(selectedCategories.filter((c) => c !== category));
  const removeMaterial = (material) =>
    setSelectedMaterials(selectedMaterials.filter((m) => m !== material));
  const removeColor = (color) =>
    setSelectedColors(selectedColors.filter((c) => c !== color));

  // Render nothing while redirecting a bad URL
  if (!activeAesthetic) return null;

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* 🚀 CUSTOM HERO SECTION FOR AESTHETICS */}
      <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
        {/* Background Image dynamically loaded from our data */}
        <img
          src={activeAesthetic.image}
          alt={activeAesthetic.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark Gradient Overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-transparent"></div>

        {/* Hero Content */}
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <span className="text-sky-400 font-bold tracking-widest uppercase mb-2">
            {activeAesthetic.subtitle}
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            The {activeAesthetic.title} Edit
          </h1>
          <p className="text-lg text-gray-200 max-w-2xl">
            Curated furniture and decor pieces to perfectly capture your
            AI-generated vision.
          </p>
        </div>
      </div>

      {/* MAIN LAYOUT (Identical to RoomPage) */}
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* THE SIDEBAR */}
          <div className="w-full lg:w-1/4 lg:sticky lg:top-8 flex-shrink-0 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto pr-2 custom-scrollbar">
            <ProductFilter
              formOptions={formOptions}
              // We pass null for activeRoomPage so the filter knows we aren't in a specific room
              activeRoomPage={null}
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
            {/* Active Filters Row */}
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCategories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30"
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
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
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
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30"
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30"
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

            {/* Products List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-accent"></div>
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
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  No products found
                </h2>
                <p className="text-gray-500 max-w-md mb-6">
                  Try adjusting your filters to see more results for this
                  aesthetic.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setPriceRange("All");
                    setInStockOnly(false);
                    setSelectedMaterials([]);
                    setSelectedColors([]);
                  }}
                  className="bg-text-accent text-white font-bold py-2.5 px-6 rounded-xl hover:bg-green-600 transition-colors"
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

export default AestheticPage;
