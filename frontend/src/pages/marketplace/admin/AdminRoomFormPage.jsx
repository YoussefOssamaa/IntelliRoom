import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../../config/axios.config";
import toast, { Toaster } from "react-hot-toast";

const AdminRoomFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // If there is an ID in the URL, we are in Edit Mode
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Flattened state for easy input binding
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
    thumbnailUrl: "",
    bannerUrl: "",
    defaultFloorplanUrl: "",
    threeDEnvironmentModel: "",
    baseLightingConfig: "",
  });

  // Fetch existing room data if in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const fetchRoom = async () => {
        try {
          // Adjust this endpoint to match your single-room fetch route!
          const response = await axios.get(`/rooms/admin/${id}`);
          const room = response.data.data;

          setFormData({
            name: room.name || "",
            slug: room.slug || "",
            description: room.description || "",
            isActive: room.isActive !== false, // Defaults to true
            thumbnailUrl: room.media?.thumbnailUrl || "",
            bannerUrl: room.media?.bannerUrl || "",
            defaultFloorplanUrl: room.designerAssets?.defaultFloorplanUrl || "",
            threeDEnvironmentModel:
              room.designerAssets?.threeDEnvironmentModel || "",
            baseLightingConfig: room.designerAssets?.baseLightingConfig || "",
          });
        } catch (error) {
          toast.error("Failed to fetch room details");
          navigate("/ecomm/admin/rooms"); // Kick them back if the room doesn't exist
        } finally {
          setIsLoading(false);
        }
      };
      fetchRoom();
    }
  }, [id, navigate, isEditMode]);

  // --- Handlers ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // Auto-generate slug only if we are creating a new room
      if (name === "name" && !isEditMode) {
        newData.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }
      return newData;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Room Name is required";
    if (!formData.slug.trim()) newErrors.slug = "Slug is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      isActive: formData.isActive,
    };

    // 2. Only attach the 'media' object if at least ONE image was provided
    if (formData.thumbnailUrl || formData.bannerUrl) {
      payload.media = {};
      if (formData.thumbnailUrl)
        payload.media.thumbnailUrl = formData.thumbnailUrl;
      if (formData.bannerUrl) payload.media.bannerUrl = formData.bannerUrl;
    }

    // 3. Only attach 'designerAssets' if at least ONE asset was provided
    if (
      formData.defaultFloorplanUrl ||
      formData.threeDEnvironmentModel ||
      formData.baseLightingConfig
    ) {
      payload.designerAssets = {};
      if (formData.defaultFloorplanUrl)
        payload.designerAssets.defaultFloorplanUrl =
          formData.defaultFloorplanUrl;
      if (formData.threeDEnvironmentModel)
        payload.designerAssets.threeDEnvironmentModel =
          formData.threeDEnvironmentModel;
      if (formData.baseLightingConfig)
        payload.designerAssets.baseLightingConfig = formData.baseLightingConfig;
    }

    try {
      if (isEditMode) {
        await axios.put(`/rooms/${id}`, payload);
        toast.success("Room updated successfully!");
      } else {
        await axios.post("/rooms", payload);
        toast.success("Room created successfully!");
      }

      // Wait a tiny bit for the toast to show, then go back to table
      setTimeout(() => navigate("/ecomm/admin/rooms"), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save room.");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate("/ecomm/admin/rooms")}
            className="text-gray-500 hover:text-text-accent text-sm font-bold flex items-center gap-2 mb-2 transition-colors"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Rooms
          </button>
          <h1 className="text-3xl font-extrabold text-text-primary">
            {isEditMode ? "Edit Room" : "Create New Room"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Basic Info */}
        <div className="bg-white p-8 rounded-2xl border border-[#e0e0e0] shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
            1. Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Room Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${errors.name ? "border-red-500" : "border-[#e0e0e0]"} rounded-xl focus:outline-none focus:border-text-accent`}
                placeholder="e.g. Living Room"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Slug (URL) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${errors.slug ? "border-red-500" : "border-[#e0e0e0]"} rounded-xl focus:outline-none focus:border-text-accent lowercase bg-gray-50`}
                placeholder="e.g. living-room"
              />
              {errors.slug && (
                <p className="text-red-500 text-xs mt-1">{errors.slug}</p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleInputChange}
              maxLength="500"
              className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent resize-none"
              placeholder="Brief description of the room style..."
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {formData.description.length}/500 characters
            </p>
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="w-5 h-5 text-text-accent rounded focus:ring-text-accent"
            />
            <label
              htmlFor="isActive"
              className="ml-3 font-bold text-gray-700 cursor-pointer"
            >
              Room is Active (Visible to Customers)
            </label>
          </div>
        </div>

        {/* SECTION 2: Visuals & UI */}
        <div className="bg-white p-8 rounded-2xl border border-[#e0e0e0] shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
            2. Visuals & Media
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Banner Image URL
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Used for the wide header at the top of the room page.
              </p>
              <input
                type="url"
                name="bannerUrl"
                value={formData.bannerUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                placeholder="/marketplace/defaultRoomPic.jpg"
              />
              {formData.bannerUrl && (
                <div className="mt-3 w-full h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={formData.bannerUrl}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Thumbnail Image URL
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Used for small grid layouts and cards.
              </p>
              <input
                type="url"
                name="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-text-accent"
                placeholder="/marketplace/defaultRoomPic.jpg"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Designer Assets */}
        <div className="bg-white p-8 rounded-2xl border border-[#e0e0e0] shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
            3. 3D Designer Assets
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            These files power the interactive IntelliRoom 3D editor.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Default Floorplan URL (.json / .svg)
              </label>
              <input
                type="text"
                name="defaultFloorplanUrl"
                value={formData.defaultFloorplanUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl font-mono text-sm focus:outline-none focus:border-text-accent"
                placeholder="/assets/floorplans/living-base.json"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                3D Environment Model (.gltf / .glb)
              </label>
              <input
                type="text"
                name="threeDEnvironmentModel"
                value={formData.threeDEnvironmentModel}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl font-mono text-sm focus:outline-none focus:border-text-accent"
                placeholder=""
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Base Lighting Config
              </label>
              <input
                type="text"
                name="baseLightingConfig"
                value={formData.baseLightingConfig}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl font-mono text-sm focus:outline-none focus:border-text-accent"
                placeholder="daylight-warm-preset"
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#e0e0e0] p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex justify-end gap-4 md:px-12">
          <button
            type="button"
            onClick={() => navigate("/ecomm/admin/rooms")}
            className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-[#e0e0e0] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-xl font-bold text-white bg-text-accent hover:bg-green-600 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <svg
                className="animate-spin h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {isEditMode ? "Save Changes" : "Publish Room"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminRoomFormPage;
