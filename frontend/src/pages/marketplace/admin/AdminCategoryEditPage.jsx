import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../../config/axios.config";

const AdminCategoryEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [allCategories, setAllCategories] = useState([]);
  const [primaryCategories, setPrimaryCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    parentCategory: "",
    image: "",
    thumbnailUrl: "",
    bannerUrl: "",
    isActive: true,
  });

  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all categories on load (needed for search AND for the parent dropdown)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/categories");
        if (response.data.success) {
          const cats = response.data.data;
          setAllCategories(cats);
          setPrimaryCategories(cats.filter((c) => !c.parentCategory));

          // If we loaded the page with an ID, pre-fill the form instantly
          if (id) {
            const target = cats.find((c) => c._id === id);
            if (target) {
              setFormData({
                name: target.name,
                slug: target.slug,
                description: target.description || "",
                parentCategory:
                  target.parentCategory?._id || target.parentCategory || "",
                image: target.image || "",
                thumbnailUrl: target.media?.thumbnailUrl || "",
                bannerUrl: target.media?.bannerUrl || "",
                isActive:
                  target.isActive !== undefined ? target.isActive : true,
              });
            } else {
              setFormError("Category not found.");
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormError(null);
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      setFormError("Name and Slug are required.");
      window.scrollTo(0, 0);
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      parentCategory: formData.parentCategory || null,
      image: formData.image,
      media: {
        thumbnailUrl: formData.thumbnailUrl,
        bannerUrl: formData.bannerUrl,
      },
      isActive: formData.isActive,
    };

    try {
      await axios.put(`/categories/${id}`, payload);
      navigate("/ecomm/admin/categories/list");
    } catch (error) {
      setFormError(
        error.response?.data?.message || "Failed to update category.",
      );
      window.scrollTo(0, 0);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Search Hub UI (If no ID in URL) ---
  if (!id) {
    const filteredCategories = allCategories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-3xl font-extrabold text-text-primary text-center mb-2">
          Edit Category
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Search for a primary or subcategory to modify.
        </p>

        <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search by category name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent outline-none"
            />
            <svg
              className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-100">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Loading categories...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium">
                No categories match your search.
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category._id}
                  onClick={() =>
                    navigate(`/ecomm/admin/categories/edit/${category._id}`)
                  }
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                      {category.image ? (
                        <img
                          src={category.image}
                          className="top-0 left-0 w-full h-full object-cover !rounded-none"
                          alt=""
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-text-primary">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {category.parentCategory
                          ? "Subcategory"
                          : "Primary Category"}
                      </div>
                    </div>
                  </div>
                  <div className="text-text-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Edit{" "}
                    <svg
                      className="w-4 h-4"
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
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Form UI (If ID is in URL) ---
  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-accent"></div>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-bold text-gray-500 hover:text-text-accent mb-2 flex items-center gap-1"
          >
            &larr; Back
          </button>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            Edit Category
          </h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSaving ? "Saving..." : "Update Category"}
        </button>
      </div>

      {formError && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-200">
          {formError}
        </div>
      )}

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-extrabold text-text-primary mb-4 border-b pb-2">
            Basic Details
          </h2>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent lowercase"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              name="parentCategory"
              value={formData.parentCategory}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent bg-white"
            >
              <option value="">None (Make this a Primary Category)</option>
              {primaryCategories.map(
                (cat) =>
                  cat._id !== id && (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ),
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="3"
              maxLength="500"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent resize-none"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-extrabold text-text-primary mb-4 border-b pb-2">
            Media Assets
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Main Category Image URL
              </label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  name="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  name="bannerUrl"
                  value={formData.bannerUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-extrabold text-text-primary mb-4 border-b pb-2">
            Storefront Visibility
          </h2>
          <label className="flex items-center cursor-pointer p-4 border border-[#e0e0e0] rounded-xl hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="w-5 h-5 text-text-accent border-gray-300 rounded focus:ring-text-accent cursor-pointer"
            />
            <div className="ml-3">
              <span className="block text-sm font-bold text-gray-700">
                Category is Active
              </span>
              <span className="block text-xs text-gray-500">
                Uncheck to hide this category from the customer storefront.
              </span>
            </div>
          </label>
        </div>
      </form>
    </div>
  );
};

export default AdminCategoryEditPage;
