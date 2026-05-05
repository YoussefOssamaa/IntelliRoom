import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../config/axios.config";

const AdminProductCreatePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==========================================
  // 🚀 DYNAMIC STATE
  // ==========================================
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [formOptions, setFormOptions] = useState({
    colors: [],
    materials: [],
    rooms: [],
  });
  const [primaryCategories, setPrimaryCategories] = useState([]);
  const [subCategoryDictionary, setSubCategoryDictionary] = useState({});

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await axios.get("/products/form-options");

        if (response.data.success) {
          const { colors, materials, rooms, categories } = response.data.data;

          // 🚀 DEBUG LOG: Check your browser console to see what the backend actually sent!
          console.log("Fetched Options from Backend:", response.data.data);

          setFormOptions({ colors, materials, rooms });

          // Building the dictionary from your Adjacency List Schema
          const dynamicPrimaries = [];
          const dynamicSubDict = {};

          const topLevelCategories = categories.filter(
            (cat) => !cat.parentCategory,
          );

          topLevelCategories.forEach((parent) => {
            dynamicPrimaries.push(parent.name);
            const children = categories
              .filter((cat) => cat.parentCategory === parent._id)
              .map((cat) => cat.name);

            dynamicSubDict[parent.name] = children;
          });

          setPrimaryCategories(dynamicPrimaries);
          setSubCategoryDictionary(dynamicSubDict);
        }
      } catch (err) {
        console.error("Failed to load options:", err);
        setError("Could not load form options from the server.");
      } finally {
        setIsOptionsLoading(false);
      }
    };

    fetchOptions();
  }, []);

  // 🚀 UPGRADE: ALL missing fields added here to match your Mongoose Schema exactly
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    sku: "",
    brand: "",
    shortDescription: "",
    longDescription: "",
    primaryImage: "",
    gallery: "",
    threeDModelUrl: "",
    currentPrice: "",
    originalPrice: "",
    costPerItem: "",
    stockQuantity: "",
    primaryCategory: "",
    subCategory: "",
    colors: [],
    materials: [],
    rooms: [],
    tags: "",
    width: "",
    height: "",
    depth: "",
    weight: "",
    assemblyRequired: false,
    shippingWidth: "",
    shippingHeight: "",
    shippingDepth: "",
    shippingWeight: "",
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (error) setError(null);

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "primaryCategory" && { subCategory: "" }),
    }));
  };

  const handleArrayToggle = (field, value) => {
    if (error) setError(null);
    setFormData((prev) => {
      const currentArray = prev[field];
      if (currentArray.includes(value)) {
        return {
          ...prev,
          [field]: currentArray.filter((item) => item !== value),
        };
      } else {
        return { ...prev, [field]: [...currentArray, value] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend Validation
    if (
      !formData.name.trim() ||
      !formData.sku.trim() ||
      !formData.slug.trim() ||
      !formData.brand.trim()
    ) {
      setError(
        "Please fill in all required Basic Information (Name, SKU, Slug, Brand).",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!formData.shortDescription.trim() || !formData.longDescription.trim()) {
      setError("Both short and long descriptions are required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (formData.shortDescription.length > 200) {
      setError(
        `Short description must be 200 characters or less. (Currently ${formData.shortDescription.length})`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (
      !formData.currentPrice ||
      !formData.originalPrice ||
      !formData.costPerItem ||
      !formData.stockQuantity
    ) {
      setError("Please fill out all Pricing and Inventory fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!formData.primaryCategory) {
      setError("Please select a Primary Category.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsLoading(true);
    setError(null);

    // Helpers
    const cleanArray = (str) =>
      str
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    const isCurrentlyOnSale =
      Number(formData.currentPrice) < Number(formData.originalPrice);

    // 🚀 UPGRADE: Payload structured perfectly to match product.js model
    const payload = {
      name: formData.name,
      slug: formData.slug,
      sku: formData.sku,
      brand: formData.brand,
      shortDescription: formData.shortDescription,
      longDescription: formData.longDescription,
      pricing: {
        currentPrice: Number(formData.currentPrice),
        originalPrice: Number(formData.originalPrice),
        costPerItem: Number(formData.costPerItem),
        isOnSale: isCurrentlyOnSale,
      },
      inventory: {
        stockQuantity: Number(formData.stockQuantity),
        shippingDimensions: {
          width: formData.shippingWidth
            ? Number(formData.shippingWidth)
            : undefined,
          height: formData.shippingHeight
            ? Number(formData.shippingHeight)
            : undefined,
          depth: formData.shippingDepth
            ? Number(formData.shippingDepth)
            : undefined,
          weight: formData.shippingWeight
            ? Number(formData.shippingWeight)
            : undefined,
        },
      },
      physical: {
        dimensions: {
          width: formData.width ? Number(formData.width) : undefined,
          height: formData.height ? Number(formData.height) : undefined,
          depth: formData.depth ? Number(formData.depth) : undefined,
        },
        weight: formData.weight ? Number(formData.weight) : undefined,
        assemblyRequired: formData.assemblyRequired,
      },
      media: {
        primaryImage:
          formData.primaryImage ||
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
        gallery: cleanArray(formData.gallery),
        threeDModelUrl: formData.threeDModelUrl,
      },
      categorization: {
        primary: formData.primaryCategory,
        subCategory: formData.subCategory,
        colors: formData.colors,
        materials: formData.materials,
        rooms: formData.rooms,
        tags: cleanArray(formData.tags),
      },
    };

    try {
      const response = await axios.post("/products", payload);
      if (response.data.success || response.status === 201) {
        navigate("/ecomm/admin/products/grid");
      }
    } catch (err) {
      console.error("Create error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to create product. Check server logs.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isOptionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-bold text-gray-500 hover:text-text-accent mb-2 flex items-center gap-1"
          >
            &larr; Back to Products
          </button>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            Add New Product
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-white border border-[#e0e0e0] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-text-accent hover:bg-green-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isLoading ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold flex items-start gap-3 shadow-sm animate-fade-in-down">
          <svg
            className="w-6 h-6 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-lg">Validation Error</h3>
            <p className="text-sm font-medium mt-1">{error}</p>
          </div>
        </div>
      )}

      <form
        className="flex flex-col lg:flex-row gap-8"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* LEFT COLUMN */}
        <div className="flex-1 space-y-8">
          {/* BASIC INFO */}
          <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
            <h2 className="text-lg font-extrabold text-text-primary mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g. SOFA-LHTR-01"
                    className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    URL Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="e.g. mid-century-leather-sofa"
                    className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent lowercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Brand <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Short Description (Preview){" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="shortDescription"
                  rows="2"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent resize-none"
                  placeholder="Max 200 characters..."
                />
                <div
                  className={`text-xs mt-1 font-bold text-right ${formData.shortDescription.length > 200 ? "text-red-500" : "text-gray-400"}`}
                >
                  {formData.shortDescription.length}/200
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Long Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="longDescription"
                  rows="4"
                  value={formData.longDescription}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent resize-none"
                />
              </div>
            </div>
          </div>

          {/* PRICING & INVENTORY */}
          <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
            <h2 className="text-lg font-extrabold text-text-primary mb-4">
              Pricing & Inventory
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Current Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="currentPrice"
                  min="0"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Original Price (MSRP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="originalPrice"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
                {Number(formData.currentPrice) <
                  Number(formData.originalPrice) && (
                  <p className="text-xs text-text-accent font-bold mt-1">
                    ✓ Product will be marked as "On Sale"
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Cost Per Item ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="costPerItem"
                  min="0"
                  step="0.01"
                  value={formData.costPerItem}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="stockQuantity"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
            </div>
          </div>

          {/* PHYSICAL ATTRIBUTES */}
          <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
            <h2 className="text-lg font-extrabold text-text-primary mb-4">
              Physical Attributes (Item Size)
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Depth (cm)
                </label>
                <input
                  type="number"
                  name="depth"
                  value={formData.depth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 items-end">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div className="flex items-center h-[42px]">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="assemblyRequired"
                    checked={formData.assemblyRequired}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-text-accent border-gray-300 rounded focus:ring-text-accent"
                  />
                  <span className="ml-2 text-sm font-bold text-gray-700">
                    Assembly Required
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* SHIPPING LOGISTICS */}
          <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
            <h2 className="text-lg font-extrabold text-text-primary mb-4">
              Shipping Dimensions (Box Size)
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  name="shippingWidth"
                  value={formData.shippingWidth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="shippingHeight"
                  value={formData.shippingHeight}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Depth (cm)
                </label>
                <input
                  type="number"
                  name="shippingDepth"
                  value={formData.shippingDepth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="shippingWeight"
                  value={formData.shippingWeight}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
            </div>
          </div>

          {/* MEDIA */}
          <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
            <h2 className="text-lg font-extrabold text-text-primary mb-4">
              Media & AI Assets
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Primary Image URL
                </label>
                <input
                  type="url"
                  name="primaryImage"
                  value={formData.primaryImage}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent mb-4"
                />
                {formData.primaryImage && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-[#e0e0e0] bg-gray-50">
                    <img
                      src={formData.primaryImage}
                      alt="Preview"
                      className="w-full h-full object-cover !rounded-none"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Gallery Images (Comma-separated URLs)
                </label>
                <textarea
                  name="gallery"
                  rows="2"
                  value={formData.gallery}
                  onChange={handleInputChange}
                  placeholder="https://image1.jpg, https://image2.jpg"
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  3D Model URL (.glb or .gltf)
                </label>
                <input
                  type="url"
                  name="threeDModelUrl"
                  value={formData.threeDModelUrl}
                  onChange={handleInputChange}
                  placeholder="e.g. https://your-bucket.com/models/sofa.glb"
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
            <h2 className="text-lg font-extrabold text-text-primary mb-4">
              Categorization
            </h2>

            <div className="space-y-4 mb-6 pb-6 border-b border-[#e0e0e0]">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Primary Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="primaryCategory"
                  value={formData.primaryCategory}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent bg-white"
                >
                  <option value="" disabled>
                    Select Category
                  </option>
                  {primaryCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Subcategory
                </label>
                <select
                  name="subCategory"
                  disabled={!formData.primaryCategory}
                  value={formData.subCategory}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="" disabled>
                    Select Subcategory
                  </option>
                  {formData.primaryCategory &&
                    subCategoryDictionary[formData.primaryCategory]?.map(
                      (sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ),
                    )}
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Colors
                </label>
                <div className="flex flex-wrap gap-2">
                  {formOptions.colors.length === 0 && (
                    <span className="text-xs text-gray-400">
                      No colors found
                    </span>
                  )}
                  {formOptions.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleArrayToggle("colors", color)}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${formData.colors.includes(color) ? "bg-text-accent border-text-accent text-white" : "bg-white border-[#e0e0e0] text-gray-600 hover:border-gray-400"}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Materials
                </label>
                <div className="flex flex-wrap gap-2">
                  {formOptions.materials.length === 0 && (
                    <span className="text-xs text-gray-400">
                      No materials found
                    </span>
                  )}
                  {formOptions.materials.map((material) => (
                    <button
                      key={material}
                      type="button"
                      onClick={() => handleArrayToggle("materials", material)}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${formData.materials.includes(material) ? "bg-text-accent border-text-accent text-white" : "bg-white border-[#e0e0e0] text-gray-600 hover:border-gray-400"}`}
                    >
                      {material}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Target Rooms
                </label>
                <div className="flex flex-wrap gap-2">
                  {formOptions.rooms.length === 0 && (
                    <span className="text-xs text-gray-400">
                      No rooms found
                    </span>
                  )}
                  {formOptions.rooms.map((room) => (
                    <button
                      key={room._id}
                      type="button"
                      onClick={() => handleArrayToggle("rooms", room._id)}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors capitalize ${formData.rooms.includes(room._id) ? "bg-text-accent border-text-accent text-white" : "bg-white border-[#e0e0e0] text-gray-600 hover:border-gray-400"}`}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 🚀 NEW: Search Tags added back in */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Search Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g. modern, sale, cozy"
                  className="w-full px-4 py-2 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                />
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Separate tags with commas
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductCreatePage;
