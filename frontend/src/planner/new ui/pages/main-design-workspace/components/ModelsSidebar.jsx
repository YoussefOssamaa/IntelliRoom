import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../../../components/AppIcon";
import Translator from "../../../../translator/translator";
import {
  MODE_3D_VIEW,
  MODE_3D_FIRST_PERSON,
  MODE_APPLYING_TEXTURE,
  MODE_DRAWING_ITEM_3D,
  MODE_DRAGGING_ITEM_3D,
  MODE_DRAWING_HOLE_3D,
  MODE_DRAGGING_HOLE_3D,
} from "../../../../constants";
import { buildResilientAssetUrlCandidates } from "../../../../../utils/asset-url";
import {
  getCloudModelCategoryCacheKey,
  normalizeCloudModelSubcategory,
} from "../../../../../services/cloudModelService";
import "./ModelsSidebar.css";

const translator = new Translator();
const CLOUD_MODEL_FAVORITES_STORAGE_KEY = "planner-cloud-model-favorites-v1";

const CONSTRUCTION_ITEM = {
  id: "construction",
  label: "Construction",
  icon: "HardHat",
  hasSubcategories: true,
  subcategories: [
    { id: "doors", label: "Doors", icon: "DoorOpen" },
    { id: "windows", label: "Windows", icon: "RectangleHorizontal" },
  ],
};

const TEXTURES_CATEGORY_ID = "textures";
const TEXTURE_SUBCATEGORY_PREFIX = "texture:";
const CLOUD_MODEL_SUBCATEGORY_PREFIX = "cloud-model-subcategory:";

const createTexturesItem = (subcategories = []) => ({
  id: TEXTURES_CATEGORY_ID,
  label: translator.t("Finishes"),
  icon: "SwatchBook",
  hasSubcategories: subcategories.length > 0,
  subcategories,
});

const createCloudModelSubcategoryId = (category, subCategory) =>
  `${CLOUD_MODEL_SUBCATEGORY_PREFIX}${category}:${subCategory}`;

const parseCloudModelSubcategoryId = (value) => {
  const rawValue = String(value || "");
  if (!rawValue.startsWith(CLOUD_MODEL_SUBCATEGORY_PREFIX)) return null;

  const payload = rawValue.slice(CLOUD_MODEL_SUBCATEGORY_PREFIX.length);
  const separatorIndex = payload.indexOf(":");
  if (separatorIndex < 0) return null;

  return {
    category: payload.slice(0, separatorIndex),
    subCategory: payload.slice(separatorIndex + 1),
  };
};

const EMPTY_CATALOG_DATA = {
  items: [],
  holes: { doors: [], windows: [] },
  textures: { wall: [], floor: [] },
  categories: [],
};

const EMPTY_MODEL_SECTIONS = new Set([
  "recentlyUsed",
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
const MODELS_SIDEBAR_MIN_WIDTH = 300;
const MODELS_SIDEBAR_DEFAULT_WIDTH = 460;
const MODELS_SIDEBAR_VIEWPORT_GUTTER = 72;
const THUMBNAIL_LOAD_CACHE = new Map();

const getModelsSidebarMaxWidth = () => {
  if (typeof window === "undefined") return 720;
  return Math.max(
    MODELS_SIDEBAR_MIN_WIDTH,
    Math.floor(
      Math.min(
        window.innerWidth * 0.52,
        window.innerWidth - MODELS_SIDEBAR_VIEWPORT_GUTTER,
      ),
    ),
  );
};

const getModelsSidebarDefaultWidth = () => {
  if (typeof window === "undefined") return MODELS_SIDEBAR_DEFAULT_WIDTH;
  return Math.max(
    MODELS_SIDEBAR_MIN_WIDTH,
    Math.min(
      getModelsSidebarMaxWidth(),
      Math.floor(window.innerWidth * 0.34),
      MODELS_SIDEBAR_DEFAULT_WIDTH,
    ),
  );
};

const getModelsGridColumns = (width) => {
  if (width < 250) return 1;
  if (width < 400) return 2;
  return 3;
};

const readPlainValue = (source, key) => {
  if (!source) return "";
  if (typeof source.get === "function") {
    return String(source.get(key) || "").trim();
  }

  return String(source[key] || "").trim();
};

const getModelThumbnailSrc = (model) => {
  if (!model) return "";

  if (model.prototype === "texture") {
    return (
      String(model.thumbnailUrl || "").trim() ||
      String(model.thumbnail || "").trim() ||
      String(model.previewUrl || "").trim() ||
      String(model.image || "").trim() ||
      String(model.maps?.Color || "").trim() ||
      String(model.maps?.color || "").trim() ||
      String(model.uri || "").trim()
    );
  }

  return (
    String(model.thumbnailUrl || "").trim() ||
    String(model.thumbnail || "").trim() ||
    String(model.previewUrl || "").trim() ||
    String(model.image || "").trim() ||
    String(model.topViewUrl || "").trim() ||
    readPlainValue(model.asset, "thumbnailUrl") ||
    readPlainValue(model.asset, "thumbnail") ||
    readPlainValue(model.asset, "previewUrl") ||
    readPlainValue(model.asset, "image") ||
    readPlainValue(model.asset, "topViewUrl")
  );
};

function LazyModelThumbnail({
  src,
  alt,
  fallbackIcon = "Package",
  fallbackIconSize = 40,
  containerClassName = "",
  imageClassName = "",
}) {
  const containerRef = useRef(null);
  const lastStartedSrcRef = useRef("");
  const [isVisible, setIsVisible] = useState(false);
  const [srcCandidateIndex, setSrcCandidateIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const srcCandidates = useMemo(
    () =>
      buildResilientAssetUrlCandidates(src, {
        includeBackendOrigin: true,
        includeApiBasePathVariant: true,
      }),
    [src],
  );
  const cachedThumbnail = src ? THUMBNAIL_LOAD_CACHE.get(src) : null;
  const activeSrc =
    cachedThumbnail?.status === "loaded"
      ? cachedThumbnail.resolvedSrc
      : srcCandidates[srcCandidateIndex] || "";

  useEffect(() => {
    const cachedEntry = src ? THUMBNAIL_LOAD_CACHE.get(src) : null;
    setSrcCandidateIndex(0);
    setHasError(cachedEntry?.status === "failed");
    setIsVisible(cachedEntry?.status === "loaded");
    lastStartedSrcRef.current = "";
  }, [alt, src]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !activeSrc) return undefined;

    if (cachedThumbnail?.status === "loaded") {
      setIsVisible(true);
      return undefined;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px 0px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [activeSrc, cachedThumbnail?.status]);

  useEffect(() => {
    if (!src || !activeSrc || !isVisible || hasError) return;
    if (lastStartedSrcRef.current === activeSrc) return;

    lastStartedSrcRef.current = activeSrc;
    if (THUMBNAIL_LOAD_CACHE.get(src)?.status !== "loaded") {
      THUMBNAIL_LOAD_CACHE.set(src, {
        status: "loading",
        resolvedSrc: activeSrc,
      });
    }
  }, [activeSrc, hasError, isVisible, src, srcCandidateIndex, srcCandidates.length]);

  const handleImageError = () => {
    if (srcCandidateIndex < srcCandidates.length - 1) {
      setSrcCandidateIndex((currentIndex) => currentIndex + 1);
      return;
    }

    if (src) {
      THUMBNAIL_LOAD_CACHE.set(src, {
        status: "failed",
        resolvedSrc: "",
      });
    }
    setHasError(true);
  };

  const handleImageLoad = () => {
    if (!src || !activeSrc) return;
    THUMBNAIL_LOAD_CACHE.set(src, {
      status: "loaded",
      resolvedSrc: activeSrc,
    });
  };

  return (
    <div
      ref={containerRef}
      className={`model-image-container ${!activeSrc || hasError ? "model-placeholder" : "model-thumbnail-shell"} ${containerClassName}`.trim()}
    >
      {activeSrc && isVisible && !hasError ? (
        <img
          src={activeSrc}
          alt={alt}
          className={`model-image ${imageClassName}`.trim()}
          loading="lazy"
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="model-thumbnail-fallback">
          <Icon name={fallbackIcon} size={fallbackIconSize} />
        </div>
      )}
    </div>
  );
}

function getCategoryIcon(category) {
  const iconMap = {
    kitchen: "UtensilsCrossed",
    bathroom: "Bath",
    living_room: "Sofa",
    livingroom: "Sofa",
    dining_room: "ChefHat",
    bedroom: "Bed",
    office: "Briefcase",
    outdoor: "Trees",
    hallway: "Route",
    lighting: "Lightbulb",
    decoration: "Flower",
    storage: "Archive",
    other_furniture: "Package",
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

const expandTextureCardVariants = (textures = []) => {
  const seenTextureIds = new Set();
  return textures
    .filter((texture) => {
      const textureId = String(texture?.id || texture?.textureKey || "")
        .trim()
        .toLowerCase();
      if (!textureId || seenTextureIds.has(textureId)) return false;
      seenTextureIds.add(textureId);
      return true;
    })
    .map((texture) => ({
      ...texture,
      id: `texture-${texture.id}`,
      textureKey: texture.id,
      targetType: "both",
    }));
};

function getCloudModelId(model) {
  return String(model?.id || model?.type || "").trim();
}

function normalizeFavoriteCloudModel(model) {
  const dimensions = model?.metadata?.dimensions || {};
  return {
    id: String(model?.id || "").trim(),
    type: String(model?.type || "").trim(),
    name: String(model?.name || "Untitled Model").trim(),
    category: String(model?.category || "").trim(),
    subCategory: String(model?.subCategory || model?.sub_category || "").trim(),
    sub_category: String(model?.subCategory || model?.sub_category || "").trim(),
    modelUrl: String(model?.modelUrl || "").trim(),
    thumbnailUrl: String(model?.thumbnailUrl || model?.image || "").trim(),
    topViewUrl: String(model?.topViewUrl || "").trim(),
    image: String(model?.image || model?.thumbnailUrl || "").trim(),
    metadata: {
      dimensions: {
        width: Number(dimensions?.width) || 0,
        height: Number(dimensions?.height) || 0,
        depth: Number(dimensions?.depth) || 0,
      },
    },
    prototype: "items",
    isCloudModel: true,
  };
}

function formatModelDimensions(model) {
  const dimensions = model?.metadata?.dimensions || {};
  const formatValue = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return "—";

    const roundedValue = Math.round(numericValue * 100) / 100;
    return `${String(roundedValue).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}m`;
  };

  return `W ${formatValue(dimensions.width)} · H ${formatValue(dimensions.height)} · D ${formatValue(dimensions.depth)}`;
}

function getThumbnailPreviewSrc(model) {
  const [bestCandidate] = buildResilientAssetUrlCandidates(getModelThumbnailSrc(model), {
    includeBackendOrigin: true,
    includeApiBasePathVariant: true,
  });

  return bestCandidate || "";
}

function formatAssetDetails(model) {
  if (model?.prototype === "texture") {
    return [
      formatCategoryLabel(model.category || "texture"),
      model.targetType ? formatCategoryLabel(model.targetType) : "",
      model.resolution || "",
    ]
      .filter(Boolean)
      .join(" / ");
  }

  const dimensions = model?.metadata?.dimensions || {};
  const hasDimensions = ["width", "height", "depth"].some(
    (key) => Number(dimensions?.[key]) > 0,
  );
  if (!hasDimensions) {
    return [
      formatCategoryLabel(model?.category || model?.prototype || "Model"),
      model?.subCategory || model?.sub_category
        ? formatCategoryLabel(model.subCategory || model.sub_category)
        : "",
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return formatModelDimensions(model);
}

function ModelGridCard({
  model,
  isTexture,
  isCloudModel,
  isActiveTexture,
  isPersonalUploadsView,
  isAuthenticated,
  isFavoriteCloudModel,
  cardDensity = 2,
  onToggleFavorite,
  onSelect,
}) {
  const thumbnailSrc = getModelThumbnailSrc(model);
  const previewThumbnailSrc = getThumbnailPreviewSrc(model);
  const infoTriggerRef = useRef(null);
  const [infoPopoverPlacement, setInfoPopoverPlacement] = useState("right");
  const [infoPopoverStyle, setInfoPopoverStyle] = useState(null);
  const [isInfoPopoverVisible, setIsInfoPopoverVisible] = useState(false);
  const fallbackIcon = isPersonalUploadsView
    ? "Upload"
    : isTexture
      ? "Paintbrush"
      : "Package";
  const thumbnailFallbackIconSize = cardDensity <= 1 ? 36 : cardDensity === 2 ? 30 : 24;
  const infoIconSize = cardDensity <= 1 ? 14 : cardDensity === 2 ? 13 : 11;
  const assetDetails = formatAssetDetails(model);

  const resolveInfoPopoverPlacement = () => {
    if (typeof window === "undefined") return;
    const triggerRect = infoTriggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return;

    const viewportPadding = 12;
    const popoverGap = 8;
    const popoverWidth = Math.max(
      220,
      Math.min(280, window.innerWidth - viewportPadding * 2),
    );
    const preferredRightLeft = triggerRect.right + popoverGap;
    const preferredLeftLeft = triggerRect.left - popoverWidth - popoverGap;
    const canPlaceRight =
      preferredRightLeft + popoverWidth <= window.innerWidth - viewportPadding;
    const canPlaceLeft = preferredLeftLeft >= viewportPadding;

    const placement = canPlaceRight ? "right" : "left";
    setInfoPopoverPlacement(placement);

    const left =
      canPlaceRight
        ? preferredRightLeft
        : canPlaceLeft
          ? preferredLeftLeft
          : Math.max(
              viewportPadding,
              Math.min(
                window.innerWidth - popoverWidth - viewportPadding,
                triggerRect.left + triggerRect.width / 2 - popoverWidth / 2,
              ),
            );
    const top = Math.max(
      viewportPadding,
      Math.min(window.innerHeight - viewportPadding - 220, triggerRect.top - 4),
    );

    setInfoPopoverStyle({
      left: `${left}px`,
      top: `${top}px`,
      width: `${popoverWidth}px`,
    });
  };

  useEffect(() => {
    if (!isInfoPopoverVisible) return undefined;

    const repositionPopover = () => resolveInfoPopoverPlacement();
    window.addEventListener("resize", repositionPopover);
    window.addEventListener("scroll", repositionPopover, true);

    return () => {
      window.removeEventListener("resize", repositionPopover);
      window.removeEventListener("scroll", repositionPopover, true);
    };
  }, [isInfoPopoverVisible]);

  const handleInfoPopoverOpen = () => {
    resolveInfoPopoverPlacement();
    setIsInfoPopoverVisible(true);
  };

  const handleInfoPopoverClose = () => {
    setIsInfoPopoverVisible(false);
  };

  const infoPopoverNode = (
    <div
      className={`asset-card-info-popover ${infoPopoverPlacement} ${isInfoPopoverVisible ? "visible" : ""}`}
      style={infoPopoverStyle || { visibility: "hidden" }}
      aria-hidden={!isInfoPopoverVisible}
    >
      {previewThumbnailSrc ? (
        <img
          src={previewThumbnailSrc}
          alt={model.name}
          className="asset-card-info-image"
        />
      ) : (
        <div className="asset-card-info-image asset-card-info-image-fallback">
          <Icon name={fallbackIcon} size={28} />
        </div>
      )}
      <div className="asset-card-info-title">{model.name}</div>
      <div className="asset-card-info-meta">{assetDetails}</div>
    </div>
  );

  return (
    <div
      className={`model-card ${isActiveTexture ? "texture-active" : ""} ${isTexture ? "texture-card" : ""} ${isCloudModel ? "cloud-model-card" : ""}`}
      onClick={() => onSelect(model)}
      style={{ cursor: "pointer" }}
    >
      <LazyModelThumbnail
        src={thumbnailSrc}
        alt={model.name}
        containerClassName={isCloudModel ? "cloud-model-image-container" : ""}
        imageClassName={isCloudModel ? "cloud-model-image" : ""}
        fallbackIcon={fallbackIcon}
        fallbackIconSize={thumbnailFallbackIconSize}
      />

      <div className="asset-card-actions" onClick={(event) => event.stopPropagation()}>
        {isCloudModel && isAuthenticated ? (
          <button
            type="button"
            className={`asset-card-action-btn favorite ${isFavoriteCloudModel ? "active" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(model);
            }}
            aria-label={
              isFavoriteCloudModel
                ? "Remove from favorites"
                : "Add to favorites"
            }
          >
            <Icon
              name="Star"
              size={13}
              fill={isFavoriteCloudModel ? "currentColor" : "none"}
            />
          </button>
        ) : (
          <span className="asset-card-action-spacer" />
        )}

        <div
          ref={infoTriggerRef}
          className="asset-card-info-trigger"
          onMouseEnter={handleInfoPopoverOpen}
          onMouseLeave={handleInfoPopoverClose}
          onFocusCapture={handleInfoPopoverOpen}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              handleInfoPopoverClose();
            }
          }}
        >
          <button
            type="button"
            className="asset-card-action-btn info"
            onClick={(event) => event.stopPropagation()}
            aria-label="View asset details"
          >
            <Icon name="Info" size={infoIconSize} />
          </button>
        </div>
      </div>
      {isInfoPopoverVisible && typeof document !== "undefined"
        ? createPortal(infoPopoverNode, document.body)
        : null}
    </div>
  );
}

const ModelsSidebar = ({
  isOpen,
  onClose,
  catalog,
  itemsActions,
  holesActions,
  textureActions,
  plannerState,
  plannerTextures = { wall: [], floor: [] },
  plannerTextureCategories = [],
  plannerTexturesByCategory = {},
  plannerTexturePaginationByCategory = {},
  plannerTexturesLoadingByCategory = {},
  plannerTextureErrorsByCategory = {},
  plannerTexturesLoading = false,
  plannerTexturesError = "",
  cloudModelsByCategory = {},
  cloudModelCategoryTree = [],
  cloudModelPaginationByCategory = {},
  cloudModelsLoadingByCategory = {},
  cloudModelErrorsByCategory = {},
  onRequestCloudModels,
  onRequestPlannerTextures,
  onCloudModelSelect,
  isAuthenticated = false,
  plannerUserId = "",
}) => {
  const sidebarRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState("construction");
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [expandedSection, setExpandedSection] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("name-asc");
  const [placementFilter, setPlacementFilter] = useState("all");
  const [favoriteCloudModels, setFavoriteCloudModels] = useState([]);
  const [hasLoadedFavoriteCloudModels, setHasLoadedFavoriteCloudModels] =
    useState(false);
  const [isModelsSidebarCollapsed, setIsModelsSidebarCollapsed] =
    useState(false);
  const [isCategoryBrowserCollapsed, setIsCategoryBrowserCollapsed] =
    useState(false);
  const [gridColumns, setGridColumns] = useState(2);
  const [sidebarWidth, setSidebarWidth] = useState(getModelsSidebarDefaultWidth);
  const categoryBrowserRef = useRef(null);
  const cloudCategoryButtonRefs = useRef(new Map());
  const modelsGridContainerRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const favoritesStorageKey = useMemo(() => {
    if (!isAuthenticated || !plannerUserId) return "";
    return `${CLOUD_MODEL_FAVORITES_STORAGE_KEY}:${plannerUserId}`;
  }, [isAuthenticated, plannerUserId]);

  useEffect(() => {
    const clampSidebarWidth = (candidateWidth) =>
      Math.max(
        MODELS_SIDEBAR_MIN_WIDTH,
        Math.min(
          getModelsSidebarMaxWidth(),
          Number(candidateWidth) || getModelsSidebarDefaultWidth(),
        ),
      );

    const handleWindowResize = () => {
      setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth));
    };

    setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth));
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    const container = modelsGridContainerRef.current;
    if (!container) return undefined;

    const updateGridColumns = (width) => {
      setGridColumns(getModelsGridColumns(width));
    };

    updateGridColumns(container.clientWidth || 0);

    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width || container.clientWidth || 0;
      updateGridColumns(nextWidth);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [isOpen, isCategoryBrowserCollapsed, sidebarWidth]);

  const handleSidebarResizeStart = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth =
      sidebarRef.current?.getBoundingClientRect?.().width || sidebarWidth;

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = startWidth + deltaX;
      const clampedWidth = Math.max(
        MODELS_SIDEBAR_MIN_WIDTH,
        Math.min(getModelsSidebarMaxWidth(), nextWidth),
      );
      setSidebarWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

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
  const cloudCategoryItems = useMemo(() => {
    const treeItems = Array.isArray(cloudModelCategoryTree)
      ? cloudModelCategoryTree
      : [];
    const sourceCategories = treeItems.length
      ? treeItems
      : Object.keys(cloudModelsByCategory).map((category) => ({
          key: category,
          label: formatCategoryLabel(category),
          subcategories: [],
        }));

    return sourceCategories
      .filter((entry) => !String(entry?.key || entry || "").includes("::"))
      .filter((entry) => String(entry?.key || entry || "").trim().length > 0)
      .map((entry) => {
        const categoryId = String(entry?.key || entry || "").trim();
        const subcategories = Array.isArray(entry?.subcategories)
          ? entry.subcategories
              .map((subCategory) => {
                const subCategoryId = normalizeCloudModelSubcategory(
                  subCategory?.key || subCategory?.id || subCategory,
                );
                if (!subCategoryId) return null;

                return {
                  id: createCloudModelSubcategoryId(categoryId, subCategoryId),
                  cloudCategory: categoryId,
                  cloudSubcategory: subCategoryId,
                  label: subCategory?.label || formatCategoryLabel(subCategoryId),
                  icon: getCategoryIcon(subCategoryId),
                };
              })
              .filter(Boolean)
          : [];

        return {
          id: categoryId,
          label: entry?.label || formatCategoryLabel(categoryId),
          icon: getCategoryIcon(categoryId),
          hasSubcategories: subcategories.length > 0,
          subcategories,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [cloudModelCategoryTree, cloudModelsByCategory]);
  const cloudCategorySet = useMemo(
    () => new Set(cloudCategoryItems.map((category) => category.id)),
    [cloudCategoryItems],
  );
  const selectedCloudCategory = cloudCategorySet.has(selectedCategory)
    ? selectedCategory
    : null;
  const selectedCloudSubcategory = useMemo(() => {
    if (!selectedCloudCategory) return "";
    const parsedSubcategory = parseCloudModelSubcategoryId(selectedSubcategory);
    if (!parsedSubcategory) return "";
    return parsedSubcategory.category === selectedCloudCategory
      ? parsedSubcategory.subCategory
      : "";
  }, [selectedCloudCategory, selectedSubcategory]);
  const selectedCloudModelKey = selectedCloudCategory
    ? getCloudModelCategoryCacheKey(
        selectedCloudCategory,
        selectedCloudSubcategory,
      )
    : "";
  const setCloudCategoryButtonRef = useCallback((categoryId, node) => {
    const normalizedCategoryId = String(categoryId || "").trim();
    if (!normalizedCategoryId) return;

    if (node) {
      node.dataset.cloudModelCategory = normalizedCategoryId;
      cloudCategoryButtonRefs.current.set(normalizedCategoryId, node);
    } else {
      cloudCategoryButtonRefs.current.delete(normalizedCategoryId);
    }
  }, []);

  const allPlannerTextures = useMemo(
    () => Object.values(plannerTexturesByCategory).flat(),
    [plannerTexturesByCategory],
  );
  const textureCategoryItems = useMemo(() => {
    const categories = plannerTextureCategories.length
      ? plannerTextureCategories
      : Array.from(
          new Set(
            allPlannerTextures.map((texture) =>
              String(texture?.category || "other").trim().toLowerCase(),
            ),
          ),
        );

    return categories
      .filter(Boolean)
      .map((category) => ({
        id: `${TEXTURE_SUBCATEGORY_PREFIX}${category}`,
        textureCategory: category,
        label: formatCategoryLabel(category),
        icon: getCategoryIcon(category),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [allPlannerTextures, plannerTextureCategories]);

  useEffect(() => {
    setHasLoadedFavoriteCloudModels(false);

    if (!favoritesStorageKey) {
      setFavoriteCloudModels([]);
      setHasLoadedFavoriteCloudModels(true);
      return;
    }

    try {
      const storedValue = localStorage.getItem(favoritesStorageKey);
      if (!storedValue) {
        setFavoriteCloudModels([]);
        setHasLoadedFavoriteCloudModels(true);
        return;
      }

      const parsedModels = JSON.parse(storedValue);
      if (!Array.isArray(parsedModels)) {
        setFavoriteCloudModels([]);
        setHasLoadedFavoriteCloudModels(true);
        return;
      }

      setFavoriteCloudModels(
        parsedModels
          .map((model) => normalizeFavoriteCloudModel(model))
          .filter((model) => getCloudModelId(model)),
      );
    } catch (_) {
      setFavoriteCloudModels([]);
    } finally {
      setHasLoadedFavoriteCloudModels(true);
    }
  }, [favoritesStorageKey]);

  useEffect(() => {
    if (!favoritesStorageKey || !hasLoadedFavoriteCloudModels) return;
    localStorage.setItem(
      favoritesStorageKey,
      JSON.stringify(
        favoriteCloudModels
          .map((model) => normalizeFavoriteCloudModel(model))
          .filter((model) => getCloudModelId(model)),
      ),
    );
  }, [favoriteCloudModels, favoritesStorageKey, hasLoadedFavoriteCloudModels]);

  useEffect(() => {
    if (isAuthenticated || selectedCategory !== "favorites") return;
    setSelectedCategory("construction");
  }, [isAuthenticated, selectedCategory]);

  const favoriteCloudModelIdSet = useMemo(
    () => new Set(favoriteCloudModels.map((model) => getCloudModelId(model))),
    [favoriteCloudModels],
  );

  useEffect(() => {
    if (!isOpen || !selectedCloudCategory || !selectedCloudModelKey || !onRequestCloudModels) return;
    if (cloudModelsLoadingByCategory[selectedCloudModelKey]) return;
    if (cloudModelPaginationByCategory[selectedCloudModelKey]) return;
    if ((cloudModelsByCategory[selectedCloudModelKey] || []).length > 0) return;
    onRequestCloudModels(selectedCloudCategory, {
      subCategory: selectedCloudSubcategory,
    });
  }, [
    cloudModelPaginationByCategory,
    cloudModelsByCategory,
    cloudModelsLoadingByCategory,
    isOpen,
    onRequestCloudModels,
    selectedCloudCategory,
    selectedCloudModelKey,
    selectedCloudSubcategory,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      expandedSection !== "catalog" ||
      !onRequestCloudModels ||
      cloudCategoryItems.length === 0 ||
      typeof IntersectionObserver === "undefined"
    ) {
      return undefined;
    }

    const categoryBrowser = categoryBrowserRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const categoryId = entry.target.dataset.cloudModelCategory;
          if (!categoryId) return;
          if (cloudModelsLoadingByCategory[categoryId]) return;
          if (cloudModelPaginationByCategory[categoryId]) return;
          if ((cloudModelsByCategory[categoryId] || []).length > 0) return;

          
          onRequestCloudModels(categoryId, { page: 1 });
        });
      },
      {
        root: categoryBrowser || null,
        rootMargin: "120px 0px",
        threshold: 0.01,
      },
    );

    cloudCategoryItems.forEach((category) => {
      const node = cloudCategoryButtonRefs.current.get(category.id);
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [
    cloudCategoryItems,
    cloudModelPaginationByCategory,
    cloudModelsByCategory,
    cloudModelsLoadingByCategory,
    expandedSection,
    isOpen,
    onRequestCloudModels,
  ]);

  const selectedTextureCategory =
    selectedCategory === TEXTURES_CATEGORY_ID &&
    String(selectedSubcategory || "").startsWith(TEXTURE_SUBCATEGORY_PREFIX)
      ? selectedSubcategory.slice(TEXTURE_SUBCATEGORY_PREFIX.length)
      : "";

  useEffect(() => {
    if (
      !isOpen ||
      selectedCategory !== TEXTURES_CATEGORY_ID ||
      selectedSubcategory ||
      textureCategoryItems.length === 0
    ) {
      return;
    }

    setSelectedSubcategory(textureCategoryItems[0].id);
  }, [
    isOpen,
    selectedCategory,
    selectedSubcategory,
    textureCategoryItems,
  ]);

  useEffect(() => {
    if (!isOpen || !selectedTextureCategory || !onRequestPlannerTextures) return;
    if ((plannerTexturesByCategory[selectedTextureCategory] || []).length > 0) {
      return;
    }
    onRequestPlannerTextures(selectedTextureCategory);
  }, [
    isOpen,
    onRequestPlannerTextures,
    plannerTexturesByCategory,
    selectedTextureCategory,
  ]);

  const catalogData = useMemo(() => {
    if (!catalog?.elements) return EMPTY_CATALOG_DATA;

    const items = [];
    const doors = [];
    const windows = [];
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
          thumbnailUrl: info.thumbnailUrl || info.image || null,
          topViewUrl: info.topViewUrl || null,
          prototype: "items",
        });
      }

      if (element.prototype === "holes" && info) {
        const holeItem = {
          id: key,
          name: info.title || element.name || key,
          type: element.name,
          image: info.image || null,
          thumbnailUrl: info.thumbnailUrl || info.image || null,
          topViewUrl: info.topViewUrl || null,
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

    });

    return {
      items,
      holes: { doors, windows },
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
          ...(isAuthenticated
            ? [
                {
                  id: "favorites",
                  label: favoriteCloudModels.length
                    ? `Favorites (${favoriteCloudModels.length})`
                    : "Favorites",
                  icon: "Star",
                },
              ]
            : []),
          { id: "recentlyUsed", label: "Recently Used", icon: "Clock" },
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
          ...cloudCategoryItems,
          CONSTRUCTION_ITEM,
          createTexturesItem(textureCategoryItems),
        ],
      },
    }),
    [
      cloudCategoryItems,
      favoriteCloudModels.length,
      isAuthenticated,
      textureCategoryItems,
    ],
  );

  const baseModels = useMemo(() => {
    if (selectedCategory === "favorites") {
      return isAuthenticated ? favoriteCloudModels : [];
    }

    if (EMPTY_MODEL_SECTIONS.has(selectedCategory)) {
      return [];
    }

    if (selectedCategory === TEXTURES_CATEGORY_ID) {
      const textureCategory = selectedTextureCategory;
      const texturePool = textureCategory
        ? plannerTexturesByCategory[textureCategory] || []
        : allPlannerTextures;

      return expandTextureCardVariants(texturePool).filter((texture) => {
        const matchesCategory =
          !textureCategory ||
          String(texture.category || "other").trim().toLowerCase() ===
            textureCategory;
        const matchesPlacement =
          placementFilter === "all" ||
          texture.targetType === "both" ||
          texture.targetType === placementFilter;

        return matchesCategory && matchesPlacement;
      });
    }

    switch (selectedSubcategory) {
      case "doors":
        return catalogData.holes.doors;
      case "windows":
        return catalogData.holes.windows;
      default:
        if (cloudCategorySet.has(selectedCategory)) {
          return cloudModelsByCategory[selectedCloudModelKey] || [];
        }

        return catalogData.items.filter(
          (item) => item.category === selectedCategory,
        );
    }
  }, [
    catalogData,
    cloudModelsByCategory,
    cloudCategorySet,
    favoriteCloudModels,
    allPlannerTextures,
    isAuthenticated,
    placementFilter,
    plannerTexturesByCategory,
    selectedCategory,
    selectedCloudModelKey,
    selectedSubcategory,
    selectedTextureCategory,
  ]);

  const filteredModels = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const queryFilteredModels = normalizedQuery
      ? baseModels.filter((model) => {
          const searchableText = [
            model.name,
            model.displayName,
            model.category,
            model.subCategory,
            model.sub_category,
            model.fileName,
            ...(Array.isArray(model.tags) ? model.tags : []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(normalizedQuery);
        })
      : baseModels;

    return queryFilteredModels.slice().sort((left, right) => {
      if (sortMode === "name-desc") {
        return String(right.name || "").localeCompare(String(left.name || ""));
      }

      if (sortMode === "category") {
        return String(left.category || "").localeCompare(
          String(right.category || ""),
        );
      }

      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }, [baseModels, searchQuery, sortMode]);

  const handleToggleFavoriteCloudModel = (model) => {
    if (!isAuthenticated) return;

    const modelId = getCloudModelId(model);
    if (!modelId) return;

    setFavoriteCloudModels((currentModels) => {
      const alreadyFavorite = currentModels.some(
        (currentModel) => getCloudModelId(currentModel) === modelId,
      );

      if (alreadyFavorite) {
        return currentModels.filter(
          (currentModel) => getCloudModelId(currentModel) !== modelId,
        );
      }

      return [normalizeFavoriteCloudModel(model), ...currentModels];
    });
  };

  const handleItemClick = (item) => {
    if (item.isCloudModel) {
      onCloudModelSelect?.(item, { isIn3DView });
      return;
    }

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
    const isCloudCategory = cloudCategorySet.has(categoryId);
    const shouldCollapseCategory =
      !isCloudCategory && hasSubcategories && selectedCategory === categoryId;
    setSelectedCategory(shouldCollapseCategory ? null : categoryId);
    setSelectedSubcategory(null);
  };

  const handleSubcategoryClick = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
  };

  const isShowingTextures = selectedCategory === TEXTURES_CATEGORY_ID;
  const isLoadingCloudCategory = Boolean(
    selectedCloudModelKey && cloudModelsLoadingByCategory[selectedCloudModelKey],
  );
  const isLoadingTextureCategory = Boolean(
    selectedTextureCategory &&
      plannerTexturesLoadingByCategory[selectedTextureCategory],
  );
  const activeCloudCategoryError =
    selectedCloudModelKey && cloudModelErrorsByCategory[selectedCloudModelKey]
      ? cloudModelErrorsByCategory[selectedCloudModelKey]
      : "";
  const activeTextureError =
    isShowingTextures && selectedTextureCategory
      ? plannerTextureErrorsByCategory[selectedTextureCategory] || plannerTexturesError
      : isShowingTextures
        ? plannerTexturesError
        : "";
  const activeCloudPagination = selectedCloudModelKey
    ? cloudModelPaginationByCategory[selectedCloudModelKey]
    : null;
  const activeTexturePagination = selectedTextureCategory
    ? plannerTexturePaginationByCategory[selectedTextureCategory]
    : null;
  const canLoadMoreCloudModels = Boolean(
    selectedCloudCategory &&
      activeCloudPagination?.hasMore &&
      !isLoadingCloudCategory &&
      !searchQuery.trim(),
  );
  const canLoadMoreTextures = Boolean(
    isShowingTextures &&
      selectedTextureCategory &&
      activeTexturePagination?.hasMore &&
      !isLoadingTextureCategory &&
      !searchQuery.trim(),
  );

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    const container = modelsGridContainerRef.current;
    if (!isOpen || !sentinel || !container) return undefined;
    if (!canLoadMoreCloudModels && !canLoadMoreTextures) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (canLoadMoreCloudModels) {
          onRequestCloudModels?.(selectedCloudCategory, {
            append: true,
            subCategory: selectedCloudSubcategory,
          });
        } else if (canLoadMoreTextures) {
          onRequestPlannerTextures?.(selectedTextureCategory, { append: true });
        }
      },
      { root: container, rootMargin: "220px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    canLoadMoreCloudModels,
    canLoadMoreTextures,
    isOpen,
    onRequestCloudModels,
    onRequestPlannerTextures,
    selectedCloudCategory,
    selectedCloudSubcategory,
    selectedTextureCategory,
  ]);

  useEffect(() => {
    if (!isOpen) return;
  }, [
    isOpen,
  ]);

  if (!isOpen) return null;

  return (
    <div
      ref={sidebarRef}
      className={`models-sidebar ${isModelsSidebarCollapsed ? "collapsed" : ""}`}
      style={{
        width: isModelsSidebarCollapsed ? undefined : `${sidebarWidth}px`,
        maxWidth: isModelsSidebarCollapsed
          ? undefined
          : `${getModelsSidebarMaxWidth()}px`,
      }}
    >
      {isModelsSidebarCollapsed ? (
        <button
          type="button"
          className="models-sidebar-expand-toggle"
          aria-label="Expand models sidebar"
          title="Expand models sidebar"
          onClick={() => setIsModelsSidebarCollapsed(false)}
        >
          <Icon name="ChevronRight" size={16} />
        </button>
      ) : (
        <>
          <button
            type="button"
            className="models-sidebar-collapse-toggle"
            aria-label="Collapse models sidebar"
            title="Collapse models sidebar"
            onClick={() => setIsModelsSidebarCollapsed(true)}
          >
            <Icon name="ChevronLeft" size={16} />
          </button>

          <div
            className={`category-browser-shell ${isCategoryBrowserCollapsed ? "collapsed" : ""}`}
          >
        <div ref={categoryBrowserRef} className="category-browser">
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
                          ref={
                            cloudCategorySet.has(item.id)
                              ? (node) => setCloudCategoryButtonRef(item.id, node)
                              : undefined
                          }
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
        <button
          type="button"
          className="category-browser-collapse-toggle"
          aria-label={
            isCategoryBrowserCollapsed
              ? "Expand categories"
              : "Collapse categories"
          }
          onClick={() =>
            setIsCategoryBrowserCollapsed((currentState) => !currentState)
          }
        >
          <Icon
            name={isCategoryBrowserCollapsed ? "ChevronRight" : "ChevronLeft"}
            size={16}
          />
        </button>
      </div>

      <div ref={modelsGridContainerRef} className="models-grid-container">
        <div className="models-grid-header">
          <h3 className="models-grid-title">
            {isShowingTextures ? translator.t("Finishes") : "Models"}
          </h3>

          <div className="models-grid-actions">
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

        <div className="asset-browser-controls">
          <div className="asset-search-wrap">
            <Icon name="Search" size={15} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={isShowingTextures ? translator.t("Search finishes") : "Search models"}
              className="asset-search-input"
            />
          </div>
          <select
            className="asset-filter-select"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            aria-label="Sort assets"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="category">Category</option>
          </select>
          {isShowingTextures && (
            <select
              className="asset-filter-select compact"
              value={placementFilter}
              onChange={(event) => setPlacementFilter(event.target.value)}
              aria-label={translator.t("Filter finish placement")}
            >
              <option value="all">All</option>
              <option value="wall">Wall</option>
              <option value="floor">Floor</option>
            </select>
          )}
        </div>

        {isShowingTextures && (
          <div className="texture-instructions">
            {activeTextureKey
              ? translator.t(
                  "Click a {0} in 3D view to apply \"{1}\".",
                  activeTextureTargetType === "floor"
                    ? "floor"
                    : activeTextureTargetType === "wall"
                      ? "wall side"
                      : "wall side or floor",
                  activeTextureKey,
                )
              : translator.t(
                  "Select a finish, then click a wall side or floor in 3D view.",
                )}
          </div>
        )}

        {activeCloudCategoryError && (
          <div className="personal-upload-error">{activeCloudCategoryError}</div>
        )}

        {activeTextureError && (
          <div className="personal-upload-error">{activeTextureError}</div>
        )}

        {(isLoadingCloudCategory ||
          (isShowingTextures &&
            (plannerTexturesLoading || isLoadingTextureCategory))) &&
        filteredModels.length === 0 ? (
          <div
            className={`models-grid columns-${gridColumns} skeleton-grid`}
            aria-label="Loading assets"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="model-card model-card-skeleton" key={index}>
                <div className="model-skeleton-thumb" />
                <div className="model-skeleton-line" />
              </div>
            ))}
          </div>
        ) : filteredModels.length > 0 ? (
          <div className={`models-grid columns-${gridColumns}`}>
            {filteredModels.map((model) => {
              const isTexture = model.prototype === "texture";
              const isCloudModel = Boolean(model.isCloudModel);
              const isActiveTexture =
                isTexture &&
                activeTextureKey === model.textureKey &&
                activeTextureTargetType === model.targetType;
              const modelId = getCloudModelId(model);
              const isFavoriteCloudModel =
                isCloudModel && modelId
                  ? favoriteCloudModelIdSet.has(modelId)
                  : false;

              return (
                <ModelGridCard
                  key={`${model.id || model.type}-${isTexture ? model.targetType : "asset"}`}
                  model={model}
                  isTexture={isTexture}
                  isCloudModel={isCloudModel}
                  isActiveTexture={isActiveTexture}
                  isPersonalUploadsView={false}
                  isAuthenticated={isAuthenticated}
                  isFavoriteCloudModel={isFavoriteCloudModel}
                  cardDensity={gridColumns}
                  onToggleFavorite={handleToggleFavoriteCloudModel}
                  onSelect={handleItemClick}
                />
              );
            })}
          </div>
        ) : (
          <div className="models-empty-state">
            <Icon
              name={
                selectedCategory === "favorites"
                    ? "Star"
                    : "Package"
              }
              size={32}
            />
            <p className="models-empty-title">
              {selectedCategory === "favorites"
                  ? "No favorite cloud models yet"
                : isShowingTextures
                  ? translator.t("No finishes available yet")
                  : "No models in this category yet"}
            </p>
            <p className="models-empty-copy">
              {selectedCategory === "favorites"
                  ? "Use the star icon on any cloud model card to save it here."
                : isShowingTextures
                  ? translator.t("Once finishes are available in MongoDB, they will show up here automatically.")
                  : "Pick another category or subcategory to keep exploring."}
            </p>
          </div>
        )}
        <div ref={loadMoreSentinelRef} className="asset-load-more-sentinel">
          {(canLoadMoreCloudModels || canLoadMoreTextures) &&
          filteredModels.length > 0 ? (
            <span>Loading more...</span>
          ) : null}
        </div>
      </div>
      <div
        className="models-sidebar-resize-handle"
        onPointerDown={handleSidebarResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize models sidebar"
      />
        </>
      )}
    </div>
  );
};

export default ModelsSidebar;
