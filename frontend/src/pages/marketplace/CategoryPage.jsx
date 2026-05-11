import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ProductCard from "./ProductCard"; // Adjust paths if needed
import ProductFilter from "./ProductFilter";
import axios from "../../config/axios.config";

const CategoryPage = () => {
  // 1. ROUTER PARAMS
  const params = useParams();
  const activeSlug = params.categorySlug || params.slug || Object.values(params)[0];

  // 2. STATE DECLARATIONS (Must always come before UseEffects!)
  const [formOptions, setFormOptions] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null); 
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryNotFound, setCategoryNotFound] = useState(false);

  // Filter States
  const [selectedSubCategories, setSelectedSubCategories] = useState([]); 
  const [priceRange, setPriceRange] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Recommended");
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  // 3. EFFECTS

  // Clear subcategories when navigating to a new parent category
  useEffect(() => {
    setSelectedSubCategories([]);
  }, [activeSlug]);

  // Fetch Form Options
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

  // Identify the exact category from the Slug/Name
  useEffect(() => {
    if (formOptions && formOptions.categories && activeSlug) {
      
      const exactCategory = formOptions.categories.find(c => {
        const dbSlug = c.slug;
        const generatedSlug = c.name.toLowerCase().replace(/\s+/g, '-');
        return dbSlug === activeSlug || generatedSlug === activeSlug;
      });
      
      if (exactCategory) {
        setCurrentCategory(exactCategory);
      } else {
        setCategoryNotFound(true);
        setIsLoading(false);
      }
    }
  }, [formOptions, activeSlug]);

  // Fetch Products
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      if (!currentCategory) return; 

      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        
        queryParams.append("category", currentCategory._id); 

        if (inStockOnly) queryParams.append("inStockOnly", "true");
        if (sortBy !== "Recommended") queryParams.append("sort", sortBy);
        if (selectedMaterials.length > 0) queryParams.append("materials", selectedMaterials.join(","));
        if (selectedColors.length > 0) queryParams.append("colors", selectedColors.join(","));
        if (selectedSubCategories.length > 0) queryParams.append("categories", selectedSubCategories.join(","));

        if (priceRange !== "All") {
          if (priceRange === "Under $100") queryParams.append("maxPrice", "100");
          else if (priceRange === "$100 - $500") { queryParams.append("minPrice", "100"); queryParams.append("maxPrice", "500"); }
          else if (priceRange === "Over $500") queryParams.append("minPrice", "500");
        }

        const response = await axios.get(`/products?${queryParams.toString()}`);
        if (response.data.success) {
          setProducts(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch category products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [currentCategory, selectedSubCategories, inStockOnly, selectedMaterials, selectedColors, sortBy, priceRange]);

  // --- Handlers ---
  const removeCategory = (sub) => setSelectedSubCategories(selectedSubCategories.filter((c) => c !== sub));
  const removeMaterial = (material) => setSelectedMaterials(selectedMaterials.filter((m) => m !== material));
  const removeColor = (color) => setSelectedColors(selectedColors.filter((c) => c !== color));

  // --- RENDERS ---

  // 1. Fallback UI if URL is completely invalid
  if (categoryNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Category not found</h2>
          <p className="text-gray-500 mb-6">We couldn't find the collection you're looking for.</p>
          <Link to="/ecomm" className="text-text-accent font-bold hover:underline">Return to Marketplace</Link>
        </div>
      </div>
    );
  }

  // 2. Main UI
  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* HERO SECTION */}
      <div className="bg-white border-b border-[#e0e0e0] pt-8 pb-12 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex text-sm text-gray-500 mb-6">
            <Link to="/ecomm" className="hover:text-text-accent transition-colors">Marketplace</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-400 capitalize">Categories</span>
            <span className="mx-2">/</span>
            <span className="font-medium text-text-primary">{currentCategory?.name || "Loading..."}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-4">
            The {currentCategory?.name || ""} Collection
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl">
            {currentCategory?.description || `Explore our premium selection of ${currentCategory?.name?.toLowerCase() || 'furniture'}.`}
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
              activeCategoryPage={currentCategory?.name} 
              selectedCategories={selectedSubCategories}
              setSelectedCategories={setSelectedSubCategories}
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
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedSubCategories.map((c) => (
                <span key={c} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
                  {c} <button onClick={() => removeCategory(c)} className="ml-1.5 hover:text-red-500">✕</button>
                </span>
              ))}
              {priceRange !== "All" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
                  {priceRange} <button onClick={() => setPriceRange("All")} className="ml-1.5 hover:text-red-500">✕</button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
                  In Stock <button onClick={() => setInStockOnly(false)} className="ml-1.5 hover:text-red-500">✕</button>
                </span>
              )}
              {selectedMaterials.map((m) => (
                <span key={m} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
                  {m} <button onClick={() => removeMaterial(m)} className="ml-1.5 hover:text-red-500">✕</button>
                </span>
              ))}
              {selectedColors.map((c) => (
                <span key={c} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
                  {c} <button onClick={() => removeColor(c)} className="ml-1.5 hover:text-red-500">✕</button>
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
                  <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">No products found</h2>
                <p className="text-gray-500 max-w-md mb-6">Try adjusting your filters or removing some materials to see more results.</p>
                <button
                  onClick={() => {
                    setSelectedSubCategories([]); setPriceRange("All"); setInStockOnly(false); setSelectedMaterials([]); setSelectedColors([]);
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

export default CategoryPage;