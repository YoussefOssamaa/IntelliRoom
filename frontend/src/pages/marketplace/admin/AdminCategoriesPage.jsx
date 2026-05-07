import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../config/axios.config";

const AdminCategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState([]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/categories");
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const primaryCategories = categories.filter((c) => !c.parentCategory);

  const getSubcategories = (parentId) => {
    return categories.filter((c) => {
      const parentIdToCheck = c.parentCategory?._id || c.parentCategory;
      return parentIdToCheck === parentId;
    });
  };

  const toggleExpand = (id) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id],
    );
  };

  const handleDelete = async (id, name, isPrimary) => {
    const warning = isPrimary
      ? `Are you sure you want to delete the primary category "${name}"? This will affect all subcategories inside it.`
      : `Are you sure you want to delete the subcategory "${name}"?`;

    if (window.confirm(warning)) {
      try {
        await axios.delete(`/categories/${id}`);
        setCategories((prev) => prev.filter((c) => c._id !== id));
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete category.");
      }
    }
  };

  const renderCategoryRow = (category, isSubcategory = false) => (
    <tr
      key={category._id}
      className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${isSubcategory ? "bg-gray-50/50" : "bg-white"} ${!category.isActive ? "opacity-75" : ""}`}
    >
      <td
        className={`px-6 py-4 flex items-center gap-4 ${isSubcategory ? "pl-16" : ""}`}
      >
        <div className="w-12 h-12 relative bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 rounded-lg">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className={`absolute top-0 left-0 w-full h-full object-cover !rounded-none ${!category.isActive ? "grayscale" : ""}`}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-300">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div>
          <div className="font-bold text-text-primary flex items-center gap-2">
            {isSubcategory && (
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {category.name}
            {!category.isActive && (
              <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-500 rounded border border-gray-200">
                Hidden
              </span>
            )}
          </div>
          {category.description && (
            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
              {category.description}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 font-mono text-xs">{category.slug}</td>
      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          {!isSubcategory && getSubcategories(category._id).length > 0 && (
            <button
              onClick={() => toggleExpand(category._id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title={
                expandedCategories.includes(category._id)
                  ? "Collapse"
                  : "Expand"
              }
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${expandedCategories.includes(category._id) ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
          
          <button
            onClick={() =>
              navigate(`/ecomm/admin/categories/edit/${category._id}`)
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-accent hover:bg-[#f0fdf4] transition-colors"
            title="Edit"
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
          <button
            onClick={() =>
              handleDelete(category._id, category.name, !isSubcategory)
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
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
  );

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Categories
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your store's primary and subcategories.
          </p>
        </div>
        <button
          onClick={() => navigate("/ecomm/admin/categories/create")}
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
          Add New Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-bold border-b border-[#e0e0e0]">
              <tr>
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="3" className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-accent mx-auto"></div>
                  </td>
                </tr>
              ) : primaryCategories.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="text-center py-12 text-gray-500 font-medium"
                  >
                    No categories found.
                  </td>
                </tr>
              ) : (
                primaryCategories.map((primary) => (
                  <React.Fragment key={primary._id}>
                    {renderCategoryRow(primary, false)}
                    {expandedCategories.includes(primary._id) &&
                      getSubcategories(primary._id).map((sub) =>
                        renderCategoryRow(sub, true),
                      )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
