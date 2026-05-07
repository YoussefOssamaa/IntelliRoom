import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../config/axios.config";

const AdminCategoryCreatePage = () => {
  const navigate = useNavigate();
  const [primaryCategories, setPrimaryCategories] = useState([]);

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

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/categories");
        if (response.data.success) {
          // Only top-level categories can be parents
          setPrimaryCategories(
            response.data.data.filter((c) => !c.parentCategory),
          );
        }
      } catch (error) {
        console.error("Failed to fetch categories for dropdown", error);
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormError(null);
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "name") {
        newData.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }
      return newData;
    });
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
      await axios.post("/categories", payload);
      navigate("/ecomm/admin/categories/list");
    } catch (error) {
      setFormError(
        error.response?.data?.message || "Failed to create category.",
      );
      window.scrollTo(0, 0);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-bold text-gray-500 hover:text-text-accent mb-2 flex items-center gap-1"
          >
            &larr; Back to Categories
          </button>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            Create Category
          </h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSaving ? "Creating..." : "Save Category"}
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
                placeholder="e.g. Living Room"
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
                placeholder="e.g. living-room"
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
              {primaryCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Description (Max 500 chars)
            </label>
            <textarea
              name="description"
              rows="3"
              maxLength="500"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent resize-none"
              placeholder="Optional brief description..."
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

export default AdminCategoryCreatePage;
