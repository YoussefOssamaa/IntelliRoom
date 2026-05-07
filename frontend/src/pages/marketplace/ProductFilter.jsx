import React, { useState, useMemo } from "react";

// --- Custom Filter Section Wrapper ---
const FilterSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#e0e0e0] py-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none group"
      >
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest group-hover:text-text-accent transition-colors">
          {title}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>
      {isOpen && <div className="mt-5 animate-fade-in-down">{children}</div>}
    </div>
  );
};

// --- Expandable Category Component ---
const ExpandableCategory = ({
  title,
  subcategories,
  selectedCategories,
  toggleCategory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveSelection = subcategories.some((sub) =>
    selectedCategories.includes(sub),
  );

  return (
    <li className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex w-full items-center justify-between text-left px-3 py-2 rounded-lg transition-all ${
          hasActiveSelection
            ? "bg-[#f0fdf4] text-text-accent font-bold"
            : "text-text-primary hover:bg-gray-50"
        }`}
      >
        <span className="text-sm">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {isExpanded && (
        <ul className="pl-6 mt-2 space-y-2 border-l-2 border-gray-100 ml-4">
          {subcategories.map((sub) => (
            <li key={sub} className="flex items-center group cursor-pointer">
              <button
                onClick={() => toggleCategory(sub)}
                className="flex items-center w-full focus:outline-none"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedCategories.includes(sub)
                      ? "bg-text-accent border-text-accent"
                      : "border-gray-300 bg-white group-hover:border-text-accent"
                  }`}
                >
                  {selectedCategories.includes(sub) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  )}
                </div>
                <span
                  className={`ml-3 text-sm transition-colors ${
                    selectedCategories.includes(sub)
                      ? "text-text-accent font-bold"
                      : "text-gray-600 group-hover:text-text-accent"
                  }`}
                >
                  {sub}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

// --- MAIN FILTER COMPONENT ---
const ProductFilter = ({
  activeCategoryPage,
  activeRoomPage,
  formOptions,
  selectedCategories = [],
  setSelectedCategories,
  priceRanges = ["All", "Under $100", "$100 - $500", "Over $500"],
  priceRange,
  setPriceRange,
  inStockOnly,
  setInStockOnly,
  sortOptions = [
    "Recommended",
    "Price: Low to High",
    "Price: High to Low",
    "Customer Rating",
    "Name: A-Z",
  ],
  sortBy,
  setSortBy,
  selectedMaterials = [],
  setSelectedMaterials,
  selectedColors = [],
  setSelectedColors,
}) => {
  // Show skeleton loader while waiting for backend data
  if (!formOptions || !formOptions.categories) {
    return (
      <div className="w-full bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm h-96 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  const dbColors = formOptions.colors || [];
  const dbMaterials = formOptions.materials || [];

  // Build the dynamic subcategory dictionary (with the String fix applied!)
  const subCategoryDictionary = useMemo(() => {
    let dict = {};
    const topLevel = formOptions.categories.filter(
      (cat) => !cat.parentCategory,
    );

    topLevel.forEach((parent) => {
      const children = formOptions.categories
        .filter((cat) => {
          if (!cat.parentCategory) return false;
          const parentIdToCheck =
            typeof cat.parentCategory === "object"
              ? cat.parentCategory._id
              : cat.parentCategory;
          // Capital 'S' guarantees the comparison works
          return String(parentIdToCheck) === String(parent._id);
        })
        .map((cat) => cat.name);

      dict[parent.name] = children;
    });
    return dict;
  }, [formOptions.categories]);

  // Fallback map for room pages
  const roomPrimaryDictionary = {
    "living-room": [
      "Seating",
      "Tables & Desks",
      "Lighting",
      "Rugs & Decor",
      "Storage & Cabinetry",
    ],
    bedroom: [
      "Beds & Bedroom",
      "Seating",
      "Lighting",
      "Rugs & Decor",
      "Storage & Cabinetry",
    ],
    "dining-room": [
      "Tables & Desks",
      "Seating",
      "Lighting",
      "Rugs & Decor",
      "Storage & Cabinetry",
    ],
    office: [
      "Tables & Desks",
      "Seating",
      "Lighting",
      "Storage & Cabinetry",
      "Rugs & Decor",
    ],
    kitchen: ["Seating", "Lighting", "Storage & Cabinetry", "Rugs & Decor"],
    bathroom: ["Lighting", "Rugs & Decor", "Storage & Cabinetry"],
    "outdoor-patio": ["Seating", "Tables & Desks", "Lighting", "Rugs & Decor"],
  };

  const isRoomMode = Boolean(
    activeRoomPage && roomPrimaryDictionary[activeRoomPage],
  );

  // --- Handlers ---
  const toggleCategory = (category) => {
    selectedCategories.includes(category)
      ? setSelectedCategories(selectedCategories.filter((c) => c !== category))
      : setSelectedCategories([...selectedCategories, category]);
  };

  const toggleMaterial = (material) => {
    selectedMaterials.includes(material)
      ? setSelectedMaterials(selectedMaterials.filter((m) => m !== material))
      : setSelectedMaterials([...selectedMaterials, material]);
  };

  const toggleColor = (color) => {
    selectedColors.includes(color)
      ? setSelectedColors(selectedColors.filter((c) => c !== color))
      : setSelectedColors([...selectedColors, color]);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange("All");
    setInStockOnly(false);
    setSelectedMaterials([]);
    setSelectedColors([]);
    setSortBy("Recommended");
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    priceRange !== "All" ||
    inStockOnly ||
    selectedMaterials.length > 0 ||
    selectedColors.length > 0 ||
    sortBy !== "Recommended";

  const getColorHex = (colorName) => {
    const hexMap = {
      Black: "#000000",
      "Matte Black": "#1c1c1c",
      White: "#FFFFFF",
      Cream: "#fdfbf7",
      Brown: "#8B4513",
      "Warm Oak": "#b5875c",
      Beige: "#F5F5DC",
      Grey: "#9CA3AF",
      Charcoal: "#36454F",
      Navy: "#000080",
      Blue: "#3B82F6",
      Green: "#10B981",
      "Sage Green": "#8A9A5B",
      Gold: "#D4AF37",
      "Brushed Gold": "#B8860B",
      Terracotta: "#E2725B",
    };
    return hexMap[colorName] || "#cccccc";
  };

  return (
    <div className="w-full bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs font-bold text-gray-400 hover:text-text-accent transition-colors uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-md"
          >
            Clear All
          </button>
        )}
      </div>

      <FilterSection title="Sort By" defaultOpen={false}>
        <ul className="space-y-2">
          {sortOptions.map((option) => (
            <li key={option}>
              <button
                onClick={() => setSortBy(option)}
                className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-all ${sortBy === option ? "bg-[#f0fdf4] text-text-accent font-bold" : "text-text-primary hover:bg-gray-50 hover:text-text-accent"}`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection
        title={
          activeCategoryPage ? `${activeCategoryPage} Types` : "Categories"
        }
        defaultOpen={true}
      >
        <ul className="space-y-1">
          {activeCategoryPage && subCategoryDictionary[activeCategoryPage]
            ? // SCENARIO A: We are on a specific Category Page (e.g., "Seating") - ONLY show its subcategories!
              subCategoryDictionary[activeCategoryPage].map((sub) => (
                <li
                  key={sub}
                  className="flex items-center group cursor-pointer py-1"
                >
                  <button
                    onClick={() => toggleCategory(sub)}
                    className="flex items-center w-full focus:outline-none"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCategories.includes(sub) ? "bg-text-accent border-text-accent" : "border-gray-300 bg-white group-hover:border-text-accent"}`}
                    >
                      {selectedCategories.includes(sub) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                      )}
                    </div>
                    <span
                      className={`ml-3 text-sm transition-colors ${selectedCategories.includes(sub) ? "text-text-accent font-bold" : "text-text-primary group-hover:text-text-accent"}`}
                    >
                      {sub}
                    </span>
                  </button>
                </li>
              ))
            : isRoomMode
              ? // SCENARIO B: Room Page (Expandable Folders)
                roomPrimaryDictionary[activeRoomPage]?.map((primary) => (
                  <ExpandableCategory
                    key={primary}
                    title={primary}
                    subcategories={subCategoryDictionary[primary] || []}
                    selectedCategories={selectedCategories}
                    toggleCategory={toggleCategory}
                  />
                ))
              : // SCENARIO C: Main Store Page (All Categories)
                Object.keys(subCategoryDictionary).map((primary) => (
                  <ExpandableCategory
                    key={primary}
                    title={primary}
                    subcategories={subCategoryDictionary[primary] || []}
                    selectedCategories={selectedCategories}
                    toggleCategory={toggleCategory}
                  />
                ))}
        </ul>
      </FilterSection>

      <FilterSection title="Color" defaultOpen={false}>
        <ul className="space-y-3 px-1">
          {dbColors.map((color) => (
            <li key={color} className="flex items-center group">
              <button
                onClick={() => toggleColor(color)}
                className="flex items-center w-full focus:outline-none"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedColors.includes(color) ? "bg-text-accent border-text-accent" : "border-gray-300 bg-white group-hover:border-text-accent"}`}
                >
                  {selectedColors.includes(color) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  )}
                </div>
                <div
                  className="w-3 h-3 rounded-full ml-3 border border-gray-200 shadow-sm"
                  style={{ backgroundColor: getColorHex(color) }}
                ></div>
                <span
                  className={`ml-2 text-sm transition-colors ${selectedColors.includes(color) ? "text-text-accent font-bold" : "text-text-primary group-hover:text-text-accent"}`}
                >
                  {color}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Material" defaultOpen={false}>
        <ul className="space-y-3 px-1">
          {dbMaterials.map((material) => (
            <li key={material} className="flex items-center group">
              <button
                onClick={() => toggleMaterial(material)}
                className="flex items-center w-full focus:outline-none"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedMaterials.includes(material) ? "bg-text-accent border-text-accent" : "border-gray-300 bg-white group-hover:border-text-accent"}`}
                >
                  {selectedMaterials.includes(material) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  )}
                </div>
                <span
                  className={`ml-3 text-sm transition-colors ${selectedMaterials.includes(material) ? "text-text-accent font-bold" : "text-text-primary group-hover:text-text-accent"}`}
                >
                  {material}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Price" defaultOpen={false}>
        <ul className="space-y-3 px-1">
          {priceRanges.map((range) => (
            <li key={range} className="flex items-center group">
              <button
                onClick={() => setPriceRange(range)}
                className="flex items-center w-full focus:outline-none"
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${priceRange === range ? "border-text-accent" : "border-gray-300 bg-white group-hover:border-text-accent"}`}
                >
                  {priceRange === range && (
                    <div className="w-2 h-2 rounded-full bg-text-accent"></div>
                  )}
                </div>
                <span
                  className={`ml-3 text-sm transition-colors ${priceRange === range ? "text-text-accent font-bold" : "text-text-primary group-hover:text-text-accent"}`}
                >
                  {range}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Availability" defaultOpen={true}>
        <div className="px-1 pt-1">
          <label className="flex items-center justify-between cursor-pointer group">
            <span
              className={`text-sm transition-colors ${inStockOnly ? "text-text-accent font-bold" : "text-text-primary group-hover:text-text-accent"}`}
            >
              In Stock Only
            </span>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={inStockOnly}
                onChange={() => setInStockOnly(!inStockOnly)}
              />
              <div
                className={`block w-10 h-6 rounded-full transition-colors duration-300 ${inStockOnly ? "bg-[#00e676]" : "bg-gray-200"}`}
              ></div>
              <div
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${inStockOnly ? "transform translate-x-4" : ""}`}
              ></div>
            </div>
          </label>
        </div>
      </FilterSection>
    </div>
  );
};

export default ProductFilter;
