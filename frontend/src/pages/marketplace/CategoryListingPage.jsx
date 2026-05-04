import ProductCard from "./ProductCard";
import ProductFilter from "./ProductFilter";
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";



const CategoryListingPage = () => {
  const { categoryId } = useParams();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [categoryId]);

  const formatCategoryName = (slug) => {
    if (!slug) return "All";
    return slug.charAt(0).toUpperCase() + slug.slice(1).replace("-", " ");
  };

  const pageTitle = formatCategoryName(categoryId);

  //  Filter State Memory
  const [selectedCategory, setSelectedCategory] = useState(pageTitle);
  const [priceRange, setPriceRange] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Recommended");
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  //   Database State Memory
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync URL with the category filter on first load
  useEffect(() => {
    setSelectedCategory(pageTitle);
  }, [pageTitle]);

  //  Fetching from Express whenever filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build the query string dynamically
        const queryParams = new URLSearchParams();

        if (selectedCategory !== "All") {
          queryParams.append("category", selectedCategory);
        }
        if (inStockOnly) {
          queryParams.append("inStockOnly", "true");
        }
        if (selectedMaterials.length > 0) {
          queryParams.append("materials", selectedMaterials.join(","));
        }
        if (sortBy !== "Recommended") {
          queryParams.append("sort", sortBy);
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL_BACKEND_BASE}/products?${queryParams.toString()}`,
        );
        const result = await response.json();

        if (result.success) {
          let fetchedData = result.data;

          if (priceRange !== "All") {
            if (priceRange === "Under $100") {
              fetchedData = fetchedData.filter(
                (p) => p.pricing.currentPrice < 100,
              );
            } else if (priceRange === "$100 - $500") {
              fetchedData = fetchedData.filter(
                (p) =>
                  p.pricing.currentPrice >= 100 &&
                  p.pricing.currentPrice <= 500,
              );
            } else if (priceRange === "Over $500") {
              fetchedData = fetchedData.filter(
                (p) => p.pricing.currentPrice > 500,
              );
            }
          }

          setProducts(fetchedData);
        } else {
          setError(result.message || "Failed to fetch products");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          "Could not connect to the server. Is your Express backend running?",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, inStockOnly, selectedMaterials, sortBy, priceRange]);

  const removeMaterial = (material) => {
    setSelectedMaterials(selectedMaterials.filter((m) => m !== material));
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">

      {/* Main Content Wrapper */}
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex text-sm text-gray-500 mb-6 font-medium">
          <Link to="/" className="hover:text-text-accent transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link
            to="/ecomm"
            className="hover:text-text-accent transition-colors"
          >
            Marketplace
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text-primary font-bold">{pageTitle}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column: Filter Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <ProductFilter
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              inStockOnly={inStockOnly}
              setInStockOnly={setInStockOnly}
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
            />
          </div>

          {/* Right Column: Product Grid */}
          <div className="flex-1">
            {/* Grid Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
                  {selectedCategory}
                </h1>
                <p className="text-gray-500 mt-2 font-medium">
                  Showing {products.length} results
                </p>
              </div>
            </div>

            {/* Active Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {priceRange !== "All" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30">
                  {priceRange}
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
                  In Stock
                  <button
                    onClick={() => setInStockOnly(false)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedMaterials.map((material) => (
                <span
                  key={material}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f0fdf4] text-text-accent border border-[#00e676]/30"
                >
                  {material}
                  <button
                    onClick={() => removeMaterial(material)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-accent"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center">
                <p className="text-red-600 font-bold">{error}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#e0e0e0] text-center shadow-sm">
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters or removing some materials.
                </p>
                <button
                  onClick={() => {
                    setPriceRange("All");
                    setInStockOnly(false);
                    setSelectedMaterials([]);
                  }}
                  className="btn-primary"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* The Actual Grid */
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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

export default CategoryListingPage;
