import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchInput from "../../../components/common/SearchInput";
import axios from "../../../config/axios.config";

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  //Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const response = await axios.get("/products");
        if (response.data.success) {
          setProducts(response.data.data);
        }
      } catch (error) {
        console.error(
          "Failed to fetch admin products:",
          error.response?.data || error.message,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, []);

  // Delete Handler
  const handleDelete = async (productId, productName) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      )
    ) {
      try {
        const response = await axios.delete(`/products/${productId}`);
        if (response.data.success) {
          setProducts((prevProducts) =>
            prevProducts.filter((p) => p._id !== productId),
          );
        }
      } catch (error) {
        console.error(
          "Failed to delete product:",
          error.response?.data || error.message,
        );
        alert("Failed to delete product. Please try again.");
      }
    }
  };

  // 🚀 Smart In-Memory Filtering Logic
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();

    // 1. Safely handle simple strings
    const productName = product.name || "";
    const productBrand = product.brand || "";

    // 2. THE FIX: Safely extract the category name whether it's an object or a string
    const primaryCat = product.categorization?.primary;
    const categoryName =
      typeof primaryCat === "object"
        ? primaryCat?.name || ""
        : primaryCat || "";

    // 3. Perform the search
    const matchName = productName.toLowerCase().includes(query);
    const matchBrand = productBrand.toLowerCase().includes(query);
    const matchCategory = categoryName.toLowerCase().includes(query);

    return matchName || matchBrand || matchCategory;
  });

  // Pagination Math
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Smart Pagination Logic
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
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

  const getProductImage = (product) => {
    return (
      product.media?.primaryImage ||
      product.images?.[0] ||
      product.image ||
      "https://via.placeholder.com/150"
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Product Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your store's catalog, pricing, and stock.
          </p>
        </div>
        <button
          onClick={() => navigate("/ecomm/admin/products/create")}
          className="bg-text-accent text-white font-bold py-2.5 px-5 rounded-xl shadow-sm hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Product
        </button>
      </div>

      {/* The Data Table Container */}
      <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm overflow-hidden flex flex-col">
        {/* Table Controls */}
        <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-gray-50">
          <div className="relative w-full max-w-sm">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, brand, or category..."
            />
          </div>
        </div>

        {/* The Actual Table */}
        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-bold border-b border-[#e0e0e0]">
              <tr>
                <th className="px-6 py-4 text-left">Product</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 r">Price</th>
                <th className="px-6 py-4 ">Stock</th>
                <th className="px-6 py-4 text-center">Rating</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-accent mx-auto"></div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-12 text-gray-500 font-medium"
                  >
                    No products found. Time to add some!
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                  <tr
                    key={product._id}
                    className="bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    {/* Product Image & Name */}
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 relative bg-white overflow-hidden flex-shrink-0 border border-gray-200 rounded-lg">
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="absolute top-0 left-0 w-full h-full object-cover !rounded-none"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-text-primary truncate max-w-[200px]">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {product.brand || "Unbranded"}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary capitalize">
                        {product.categorization?.primary?.name ||
                          product.categorization?.primary ||
                          "Uncategorized"}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 capitalize">
                        {product.categorization?.subCategory?.name ||
                          product.categorization?.subCategory ||
                          ""}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 font-bold text-text-primary">
                      ${product.pricing?.currentPrice?.toFixed(2) || "0.00"}
                    </td>

                    {/* Stock (Dynamically Colored) */}
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${
                          product.inventory?.stockQuantity <= 0
                            ? "text-red-500"
                            : product.inventory?.stockQuantity <= 10
                              ? "text-orange-500"
                              : "text-green-600"
                        }`}
                      >
                        {product.inventory?.stockQuantity || 0}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="px-6 py-4 font-bold text-gray-700">
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        {product.social?.averageRating || "0.0"}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Icon (Eye) */}
                        <Link
                          to={`/ecomm/product/${product.slug}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Product"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>

                        {/* Edit Icon (Pen) */}
                        <button
                          onClick={() =>
                            navigate(
                              `/ecomm/admin/products/edit/${product.slug}`,
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-accent hover:bg-[#f0fdf4] transition-colors"
                          title="Edit Product"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>

                        {/* Delete Icon (Trash Can) */}
                        <button
                          onClick={() =>
                            handleDelete(product._id, product.name)
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete Product"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && products.length > 0 && (
          <div className="p-4 border-t border-[#e0e0e0] bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="border border-[#e0e0e0] rounded-lg px-2 py-1 text-text-primary font-bold outline-none focus:border-text-accent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
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
                  className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg transition-colors ${
                    page === currentPage
                      ? "bg-text-accent text-white shadow-sm"
                      : page === "..."
                        ? "text-gray-400 cursor-default"
                        : "text-gray-500 hover:bg-gray-100"
                  }`}
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
        )}
      </div>
    </div>
  );
};

export default AdminProductsPage;
