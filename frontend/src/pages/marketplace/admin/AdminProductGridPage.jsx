import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../config/axios.config";
import ProductFilter from "../ProductFilter";

const AdminProductGridPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  // 🚀 OPTIMIZATION: State to hold all our filter options from the DB
  const [formOptions, setFormOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Recommended");
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  // 🚀 NEW: Room Filter State for Admins!
  const [selectedRooms, setSelectedRooms] = useState([]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // 🚀 OPTIMIZATION: Fetch both Products AND Form Options at the exact same time
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, optionsRes] = await Promise.all([
          axios.get("/products"),
          axios.get("/products/form-options"),
        ]);

        if (productsRes.data.success) {
          setProducts(productsRes.data.data);
        }

        if (optionsRes.data.success) {
          setFormOptions(optionsRes.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch admin grid data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Reset to page 1 whenever ANY filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategories,
    priceRange,
    inStockOnly,
    sortBy,
    selectedMaterials,
    selectedColors,
    selectedRooms, // 🚀 NEW: Added to dependencies
  ]);

  const getProductImage = (product) => {
    return (
      product.media?.primaryImage ||
      product.images?.[0] ||
      product.image ||
      "https://via.placeholder.com/300"
    );
  };

  // 1. Filter and Sort
  const filteredProducts = products
    .filter((product) => {
      // Check Categories
      if (selectedCategories.length > 0) {
        const subCatName =
          product.categorization?.subCategory?.name ||
          product.categorization?.subCategory;
        if (!selectedCategories.includes(subCatName)) {
          return false;
        }
      }

      // Check Stock
      if (
        inStockOnly &&
        (!product.inventory || product.inventory.stockQuantity <= 0)
      ) {
        return false;
      }

      // Check Price Range
      if (priceRange !== "All") {
        const price = product.pricing?.currentPrice || 0;
        if (priceRange === "Under $100" && price >= 100) return false;
        if (priceRange === "$100 - $500" && (price < 100 || price > 500))
          return false;
        if (priceRange === "Over $500" && price <= 500) return false;
      }

      // Check Colors
      if (selectedColors.length > 0) {
        const pColors = product.categorization?.colors || [];
        const hasMatchingColor = selectedColors.some((color) =>
          pColors.includes(color),
        );
        if (!hasMatchingColor) return false;
      }

      // Check Materials
      if (selectedMaterials.length > 0) {
        const pMaterials = product.categorization?.materials || [];
        const hasMatchingMaterial = selectedMaterials.some((material) =>
          pMaterials.includes(material),
        );
        if (!hasMatchingMaterial) return false;
      }

      // 🚀 NEW: Check Rooms
      if (selectedRooms.length > 0) {
        const pRooms = product.categorization?.rooms || [];
        // pRooms could be an array of ObjectIds or populated Room objects depending on your GET /products controller
        const hasMatchingRoom = selectedRooms.some((roomId) =>
          pRooms.some((pr) => pr === roomId || pr._id === roomId),
        );
        if (!hasMatchingRoom) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const priceA = a.pricing?.currentPrice || 0;
      const priceB = b.pricing?.currentPrice || 0;

      if (sortBy === "Price: Low to High") return priceA - priceB;
      if (sortBy === "Price: High to Low") return priceB - priceA;
      if (sortBy === "Name: A-Z")
        return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  // 2. Pagination Math
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGridProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // 3. Smart Pagination Logic
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Visual Catalog
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Filter and view your products as they appear to customers.
          </p>
        </div>
        <button
          onClick={() => navigate("/ecomm/admin/products/create")}
          className="bg-text-accent text-white font-bold py-2.5 px-5 rounded-xl shadow-sm hover:bg-green-600 transition-colors"
        >
          Add New Product
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* LEFT SIDE: Custom Filter */}
        <aside className="w-full md:w-72 flex-shrink-0 h-fit">
          {/* 🚀 UPGRADE: Passing the fetched options and the new room states down! */}
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
            selectedRooms={selectedRooms}
            setSelectedRooms={setSelectedRooms}
            isAdmin={true} // A little flag to tell the filter to show Admin-only sections!
          />
        </aside>

        {/* RIGHT SIDE: Product Grid & Pagination */}
        <main className="flex-1 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-[#e0e0e0]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-text-accent"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#e0e0e0] text-center text-gray-500 font-medium shadow-sm">
              No products match your current filters. Try clearing them!
            </div>
          ) : (
            <>
              {/* The Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentGridProducts.map((product) => (
                  <div
                    key={product._id}
                    className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm overflow-hidden hover:shadow-md transition-shadow group relative"
                  >
                    <div className="relative w-full aspect-square bg-white border-b border-[#e0e0e0] overflow-hidden">
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="absolute top-0 left-0 w-full h-full object-cover !rounded-none group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <div className="text-xs font-bold text-gray-400 mb-1">
                        {product.brand || "Unbranded"}
                      </div>
                      <h3 className="font-extrabold text-text-primary truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-lg text-text-primary">
                          ${product.pricing?.currentPrice?.toFixed(2) || "0.00"}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-md ${product.inventory?.stockQuantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {product.inventory?.stockQuantity > 0
                            ? `${product.inventory.stockQuantity} in stock`
                            : "Out of Stock"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              <div className="p-4 border border-[#e0e0e0] rounded-2xl bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="border border-[#e0e0e0] rounded-lg px-2 py-1 text-text-primary font-bold outline-none focus:border-text-accent"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={96}>96</option>
                  </select>
                  <span>entries</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        typeof page === "number" && handlePageChange(page)
                      }
                      disabled={page === "..."}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg transition-colors ${page === currentPage ? "bg-text-accent text-white shadow-sm" : page === "..." ? "text-gray-400 cursor-default" : "text-gray-500 hover:bg-gray-100"}`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminProductGridPage;
