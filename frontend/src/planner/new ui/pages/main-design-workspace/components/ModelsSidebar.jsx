import React, { useMemo, useRef, useState } from "react";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import {
  MODE_3D_VIEW,
  MODE_3D_FIRST_PERSON,
  MODE_APPLYING_TEXTURE,
  MODE_DRAWING_ITEM_3D,
  MODE_DRAGGING_ITEM_3D,
  MODE_DRAWING_HOLE_3D,
  MODE_DRAGGING_HOLE_3D,
} from "../../../../constants";
import "./ModelsSidebar.css";

const FALLBACK_CATALOG_ITEMS = [
  { id: "kitchen", label: "Kitchen Furniture", icon: "UtensilsCrossed" },
  { id: "bathroom", label: "Bathroom", icon: "Bath" },
  { id: "livingRoom", label: "Living Room", icon: "Sofa" },
  { id: "bedroom", label: "Bedroom", icon: "Bed" },
  { id: "office", label: "Office", icon: "Briefcase" },
  { id: "lighting", label: "Lighting", icon: "Lightbulb" },
  { id: "decorations", label: "Decorations", icon: "Flower" },
  { id: "storage", label: "Storage", icon: "Archive" },
  { id: "electronics", label: "Electronics", icon: "Tv" },
];

const CONSTRUCTION_ITEM = {
  id: "construction",
  label: "Construction",
  icon: "HardHat",
  hasSubcategories: true,
  subcategories: [
    { id: "doors", label: "Doors", icon: "DoorOpen" },
    { id: "windows", label: "Windows", icon: "RectangleHorizontal" },
    { id: "textures", label: "Textures", icon: "Paintbrush" },
  ],
};

const EMPTY_CATALOG_DATA = {
  items: [],
  holes: { doors: [], windows: [] },
  textures: { wall: [], floor: [] },
  categories: [],
};

const EMPTY_MODEL_SECTIONS = new Set([
  "recentlyUsed",
  "favorites",
  "recommended",
  "hot",
]);
const THREE_D_PLACEMENT_MODES = new Set([
  MODE_3D_VIEW,
  MODE_3D_FIRST_PERSON,
  MODE_DRAWING_ITEM_3D,
  MODE_DRAGGING_ITEM_3D,
  MODE_DRAWING_HOLE_3D,
  MODE_DRAGGING_HOLE_3D,
  MODE_APPLYING_TEXTURE,
]);

function getCategoryIcon(category) {
  const iconMap = {
    kitchen: "UtensilsCrossed",
    bathroom: "Bath",
    livingroom: "Sofa",
    bedroom: "Bed",
    office: "Briefcase",
    lighting: "Lightbulb",
    decoration: "Flower",
    storage: "Archive",
    electronics: "Tv",
    furniture: "Armchair",
    furnishings: "Armchair",
    furnishing: "Armchair",
    table: "Table",
    security: "Shield",
    telecomunication: "Wifi",
    metal: "HardDrive",
    wood: "Trees",
    text: "Type",
    image: "Image",
    other: "Package",
  };

  return iconMap[String(category || "").toLowerCase()] || "Package";
}

function formatCategoryLabel(category) {
  const normalizedCategory = String(category || "").trim();
  if (!normalizedCategory) return "Other";

  return normalizedCategory
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

const ModelsSidebar = ({
  isOpen,
  onClose,
  catalog,
  itemsActions,
  holesActions,
  textureActions,
  plannerState,
  personalModels = [],
  onPersonalModelUpload,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("office");
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [expandedSection, setExpandedSection] = useState("catalog");
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");
  const [isUploadingPersonalModel, setIsUploadingPersonalModel] =
    useState(false);
  const personalUploadInputRef = useRef(null);

  const mode = plannerState ? plannerState.get("mode") : null;
  const textureApplication = plannerState
    ? plannerState.get("textureApplication")
    : null;
  const activeTextureKey =
    mode === MODE_APPLYING_TEXTURE && textureApplication
      ? textureApplication.get("textureKey")
      : null;
  const activeTextureTargetType =
    mode === MODE_APPLYING_TEXTURE && textureApplication
      ? textureApplication.get("targetType")
      : null;
  const isIn3DView = THREE_D_PLACEMENT_MODES.has(mode);

  const catalogData = useMemo(() => {
    if (!catalog?.elements) return EMPTY_CATALOG_DATA;

    const items = [];
    const doors = [];
    const windows = [];
    const wallTextures = [];
    const floorTextures = [];
    const categorySet = new Set();

    Object.entries(catalog.elements).forEach(([key, element]) => {
      if (!element) return;

      const info = element.info || null;
      const tags = Array.isArray(info?.tag) ? info.tag : [];

      if (element.prototype === "items" && info) {
        const category = (tags[0] || "other").toLowerCase();
        categorySet.add(category);
        items.push({
          id: key,
          name: info.title || key,
          type: key,
          category,
          tags,
          image: info.image || null,
          prototype: "items",
        });
      }

      if (element.prototype === "holes" && info) {
        const holeItem = {
          id: key,
          name: info.title || element.name || key,
          type: element.name,
          image: info.image || null,
          tags,
          prototype: "holes",
        };
        const normalizedTags = tags.map((tag) => String(tag).toLowerCase());

        if (normalizedTags.some((tag) => tag.includes("door"))) {
          doors.push(holeItem);
        } else if (normalizedTags.some((tag) => tag.includes("window"))) {
          windows.push(holeItem);
        }
      }

      if (element.textures && Object.keys(element.textures).length > 0) {
        Object.entries(element.textures).forEach(
          ([textureKey, textureData]) => {
            const textureItem = {
              id: `${key}-${textureKey}`,
              textureKey,
              name: textureData.name || textureKey,
              image: textureData.uri || null,
              sourceElement: key,
              prototype: "texture",
              targetType: element.prototype === "lines" ? "wall" : "floor",
            };

            if (element.prototype === "lines") {
              wallTextures.push(textureItem);
            } else if (element.prototype === "areas") {
              floorTextures.push(textureItem);
            }
          },
        );
      }
    });

    return {
      items,
      holes: { doors, windows },
      textures: { wall: wallTextures, floor: floorTextures },
      categories: Array.from(categorySet).map((category) => ({
        id: category,
        label: formatCategoryLabel(category),
        icon: getCategoryIcon(category),
      })),
    };
  }, [catalog]);

  const categories = useMemo(
    () => ({
      personal: {
        title: "Personal",
        items: [
          {
            id: "personalUploads",
            label: personalModels.length
              ? `My Uploads (${personalModels.length})`
              : "My Uploads",
            icon: "Upload",
          },
          { id: "recentlyUsed", label: "Recently Used", icon: "Clock" },
          { id: "favorites", label: "Favorites", icon: "Star" },
        ],
      },
      explore: {
        title: "Explore",
        items: [
          { id: "recommended", label: "Recommended", icon: "TrendingUp" },
          { id: "hot", label: "Hot", icon: "Flame" },
        ],
      },
      catalog: {
        title: "Catalog",
        items: [
          ...(catalogData.categories.length > 0
            ? catalogData.categories
            : FALLBACK_CATALOG_ITEMS),
          CONSTRUCTION_ITEM,
        ],
      },
    }),
    [catalogData.categories, personalModels.length],
  );

  const filteredModels = useMemo(() => {
    if (selectedCategory === "personalUploads") {
      return personalModels;
    }

    if (EMPTY_MODEL_SECTIONS.has(selectedCategory)) {
      return [];
    }

    switch (selectedSubcategory) {
      case "doors":
        return catalogData.holes.doors;
      case "windows":
        return catalogData.holes.windows;
      case "textures":
        return [...catalogData.textures.wall, ...catalogData.textures.floor];
      default:
        return catalogData.items.filter(
          (item) => item.category === selectedCategory,
        );
    }
  }, [catalogData, personalModels, selectedCategory, selectedSubcategory]);

  const handleItemClick = (item) => {
    if (item.prototype === "texture") {
      textureActions?.selectTexture?.(item.textureKey, item.targetType);
      return;
    }

    if (!item.type) return;

    if (item.prototype === "holes") {
      if (!holesActions) return;
      if (isIn3DView) {
        holesActions.selectToolDrawingHole3D(item.type);
      } else {
        holesActions.selectToolDrawingHole(item.type);
      }
      return;
    }

    if (item.prototype === "items" && itemsActions) {
      if (isIn3DView) {
        itemsActions.selectToolDrawingItem3D(item.type);
      } else {
        itemsActions.selectToolDrawingItem(item.type);
      }
    }
  };

  const handleCategoryClick = (categoryId, hasSubcategories) => {
    const shouldCollapseCategory =
      hasSubcategories && selectedCategory === categoryId;
    setSelectedCategory(shouldCollapseCategory ? null : categoryId);
    setSelectedSubcategory(null);
  };

  const handleSubcategoryClick = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
  };

  const handleTriggerPersonalUpload = () => {
    setExpandedSection("personal");
    setSelectedCategory("personalUploads");
    setSelectedSubcategory(null);
    personalUploadInputRef.current?.click?.();
  };

  const handlePersonalUploadChange = async (event) => {
    const [file] = Array.from(event.target?.files || []);
    event.target.value = "";
    if (!file || !onPersonalModelUpload) return;

    setUploadErrorMessage("");
    setIsUploadingPersonalModel(true);
    setExpandedSection("personal");
    setSelectedCategory("personalUploads");
    setSelectedSubcategory(null);

    try {
      await onPersonalModelUpload(file);
    } catch (error) {
      setUploadErrorMessage(error?.message || "Failed to upload model");
    } finally {
      setIsUploadingPersonalModel(false);
    }
  };

  if (!isOpen) return null;

  const isShowingTextures = selectedSubcategory === "textures";
  const isPersonalUploadsView = selectedCategory === "personalUploads";

  return (
    <div className="models-sidebar">
      <input
        ref={personalUploadInputRef}
        type="file"
        accept=".glb,model/gltf-binary"
        className="personal-model-upload-input"
        onChange={handlePersonalUploadChange}
      />

      <div className="category-browser">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Categories</h2>
          <button onClick={onClose} className="close-btn">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          {Object.entries(categories).map(([sectionKey, section]) => (
            <div key={sectionKey} className="section-group">
              <button
                onClick={() =>
                  setExpandedSection(
                    expandedSection === sectionKey ? null : sectionKey,
                  )
                }
                className="section-header"
              >
                <span className="section-title">{section.title}</span>
                <Icon
                  name="ChevronDown"
                  size={20}
                  className={`chevron-icon ${expandedSection === sectionKey ? "rotated" : ""}`}
                />
              </button>

              {expandedSection === sectionKey && (
                <div className="category-list">
                  {section.items.map((item) => (
                    <div key={item.id}>
                      <button
                        onClick={() =>
                          handleCategoryClick(item.id, item.hasSubcategories)
                        }
                        className={`category-item ${selectedCategory === item.id ? "active" : ""}`}
                      >
                        <Icon name={item.icon} size={18} />
                        <span className="category-label">{item.label}</span>
                        {item.hasSubcategories && (
                          <Icon
                            name="ChevronDown"
                            size={16}
                            className={`subcategory-chevron ${selectedCategory === item.id ? "rotated" : ""}`}
                          />
                        )}
                      </button>

                      {item.hasSubcategories &&
                        selectedCategory === item.id && (
                          <div className="subcategory-list">
                            {item.subcategories.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => handleSubcategoryClick(sub.id)}
                                className={`subcategory-item ${selectedSubcategory === sub.id ? "active" : ""}`}
                              >
                                <Icon name={sub.icon} size={16} />
                                <span className="subcategory-label">
                                  {sub.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="models-grid-container">
        <div className="models-grid-header">
          <h3 className="models-grid-title">
            {isShowingTextures ? "Textures" : "Models"}
          </h3>

          <div className="models-grid-actions">
            {isPersonalUploadsView && (
              <button
                type="button"
                className="upload-model-btn"
                onClick={handleTriggerPersonalUpload}
                disabled={isUploadingPersonalModel}
              >
                <Icon name="Upload" size={14} />
                <span>
                  {isUploadingPersonalModel ? "Uploading..." : "Upload GLB"}
                </span>
              </button>
            )}

            {isShowingTextures && activeTextureKey && (
              <button
                className="cancel-texture-btn"
                onClick={() => textureActions?.cancelTextureApplication?.()}
              >
                <Icon name="X" size={14} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {isShowingTextures && (
          <div className="texture-instructions">
            {activeTextureKey
              ? `Click on a ${activeTextureTargetType === "wall" ? "wall side" : "floor"} in 3D view to apply "${activeTextureKey}" texture`
              : "Select a texture below, then click on a wall side or floor in 3D view to apply it"}
          </div>
        )}

        {isPersonalUploadsView && (
          <div className="personal-upload-banner">
            <div>
              <div className="personal-upload-title">Personal Models</div>
              <div className="personal-upload-copy">
                Upload a `.glb` file and it will appear here as a placeable
                model.
              </div>
            </div>
            <button
              type="button"
              className="personal-upload-link"
              onClick={handleTriggerPersonalUpload}
            >
              Choose File
            </button>
          </div>
        )}

        {uploadErrorMessage && (
          <div className="personal-upload-error">{uploadErrorMessage}</div>
        )}

        {filteredModels.length > 0 ? (
          <div className="models-grid">
            {filteredModels.map((model) => {
              const isTexture = model.prototype === "texture";
              const isActiveTexture =
                isTexture &&
                activeTextureKey === model.textureKey &&
                activeTextureTargetType === model.targetType;

              return (
                <div
                  key={model.id}
                  className={`model-card ${isActiveTexture ? "texture-active" : ""} ${isTexture ? "texture-card" : ""}`}
                  onClick={() => handleItemClick(model)}
                  style={{ cursor: "pointer" }}
                >
                  {model.image ? (
                    <div className="model-image-container">
                      <Image
                        src={model.image}
                        alt={model.name}
                        className="model-image"
                      />
                    </div>
                  ) : (
                    <div className="model-image-container model-placeholder">
                      <Icon
                        name={
                          isPersonalUploadsView
                            ? "Upload"
                            : isTexture
                              ? "Paintbrush"
                              : "Package"
                        }
                        size={40}
                      />
                    </div>
                  )}
                  <div className="model-info">
                    <h4 className="model-name">{model.name}</h4>
                    {isTexture && (
                      <span
                        className={`texture-type-badge ${model.targetType}`}
                      >
                        {model.targetType === "wall" ? "Wall" : "Floor"}
                      </span>
                    )}
                    {isPersonalUploadsView && model.fileName && (
                      <span className="personal-model-file">
                        {model.fileName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="models-empty-state">
            <Icon
              name={isPersonalUploadsView ? "Upload" : "Package"}
              size={32}
            />
            <p className="models-empty-title">
              {isPersonalUploadsView
                ? "No personal models yet"
                : "No models in this category yet"}
            </p>
            <p className="models-empty-copy">
              {isPersonalUploadsView
                ? "Upload a `.glb` file to add your own object to the planner."
                : "Pick another category or subcategory to keep exploring."}
            </p>
            {isPersonalUploadsView && (
              <button
                type="button"
                className="upload-model-empty-btn"
                onClick={handleTriggerPersonalUpload}
              >
                <Icon name="Upload" size={14} />
                <span>Upload GLB</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelsSidebar;
