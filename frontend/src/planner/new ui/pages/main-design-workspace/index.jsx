import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import PropTypes from "prop-types";
import { useNavigate, useParams } from "react-router-dom";
import TopNavigationBar from "./components/TopNavigationBar";
import LeftToolbar from "./components/LeftToolbar";
import FloorPlanSidebar from "./components/FloorPlanSidebar";
import ModelsSidebar from "./components/ModelsSidebar";
import GallerySidebar from "./components/GallerySidebar";
import AdvancedToolsSidebar from "./components/AdvancedToolsSidebar";
import WorkspaceCanvas from "./components/WorkspaceCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import BottomRightControls from "./components/BottomRightControls";
import RenderTopModeSelector from "./components/RenderTopModeSelector";
import RenderLeftSidebar, {
  ROOM_TYPE_OPTIONS,
} from "./components/RenderLeftSidebar";
import RenderRightSidebar from "./components/RenderRightSidebar";
import BottomRenderActionBar from "./components/BottomRenderActionBar";

import * as actions from "../../../actions/export";
import { Translator, Catalog } from "../../../index";
import { useTranslator } from "../../../translator/TranslatorContext";
import { PlannerProvider } from "../../../context/PlannerContext";
import MyCatalog from "../../../catalog/mycatalog";
import {
  ensureCloudModelRegistered,
  ensureCloudModelsRegistered,
  warmCloudModelSelection,
} from "../../../catalog/utils/cloud-model-definitions";
import {
  MODE_IDLE,
  MODE_3D_VIEW,
  MODE_3D_FIRST_PERSON,
  MODE_APPLYING_TEXTURE,
} from "../../../constants";
import {
  fetchCloudModelCategories,
  fetchCloudModelCategoryTree,
  createPlannerItemAssetPayload,
  extractCloudModelTypesFromSceneData,
  fetchCloudModelsByTypes,
  fetchCloudModelsByCategoryPage,
  getCloudModelCategoryCacheKey,
  normalizeCloudModelCategory,
  normalizeCloudModelSubcategory,
} from "../../../../services/cloudModelService";
import {
  extractCloudTextureKeysFromSceneData,
  fetchCloudTextureCategories,
  fetchCloudTexturesByCategoryPage,
  fetchCloudTexturesByIds,
} from "../../../../services/cloudTextureService";
import {
  getProjectById,
  getProjects,
  getPlannerUserProfile,
  savePlannerProject,
} from "../../../../services/plannerProjectService";
import {
  resolveRenderCaptureImageUrl,
  submitRenderCapture,
} from "../../../../services/renderCaptureService";
import "./index.css";
//import './components/RenderCapturePreview.css';
import { syncCloudTexturesIntoCatalog } from "../../../catalog/utils/cloud-texture-registry";
import { preloadPlannerTextureDefinition } from "../../../catalog/utils/texture-map-loader";

const RENDER_CAMERA_HEIGHT_MM_MIN = 0;
const RENDER_CAMERA_HEIGHT_MM_MAX = 2800;
const RENDER_VERTICAL_ROTATION_MIN = -80;
const RENDER_VERTICAL_ROTATION_MAX = 80;
const RENDER_TOP_BAR_HEIGHT = 52;
const AUTOSAVE_INTERVAL_MS = 60000;
const CAPTURE_STATUS_CAPTURED = "captured";
const CAPTURE_STATUS_PROCESSING = "processing";
const CAPTURE_STATUS_READY = "ready";
const CAPTURE_STATUS_FAILED = "failed";
const CLOUD_MODEL_PAGE_SIZE = 24;
const CLOUD_TEXTURE_PAGE_SIZE = 48;
const SHARED_CAMERA_TRANSITION_STATE_KEY = "__plannerSharedViewerCameraPose";

const dedupeTexturesBySourceId = (textures = []) => {
  const seenTextureIds = new Set();
  return textures.filter((texture) => {
    const textureId = String(texture?.id || texture?.textureKey || "")
      .trim()
      .toLowerCase();
    if (!textureId || seenTextureIds.has(textureId)) return false;
    seenTextureIds.add(textureId);
    return true;
  });
};

const convertMmToViewerUnits = (millimetersValue) =>
  Number(millimetersValue) / 10;

const clampNumber = (value, min, max) => {
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) return min;
  return Math.max(min, Math.min(max, parsedValue));
};

const humanizeElementName = (rawValue) => {
  const normalized = String(rawValue || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

function TextureCursorPreview({ texture }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!texture?.src) {
      setPosition(null);
      return undefined;
    }

    const handlePointerMove = (event) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("pointermove", handlePointerMove, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
    };
  }, [texture?.src]);

  if (!texture?.src || !position) return null;

  return (
    <img
      className="texture-cursor-preview"
      src={texture.src}
      alt=""
      aria-hidden="true"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  );
}

const buildCaptureFrameSummary = ({
  roomType = "",
  frameSummary = "",
} = {}) => {
  const summaryParts = [];
  const normalizedRoomType = humanizeElementName(roomType);
  const normalizedFrameSummary = String(frameSummary || "").trim();

  if (normalizedRoomType) {
    summaryParts.push(`Room type: ${normalizedRoomType}`);
  }

  if (normalizedFrameSummary) {
    summaryParts.push(`Visible elements: ${normalizedFrameSummary}`);
  }

  return summaryParts.join(". ");
};

const buildEditableRenderPrompt = ({
  roomType = "",
  frameSummary = "",
  detectedItems = [],
} = {}) => {
  const detectedItemSummary = Array.isArray(detectedItems)
    ? detectedItems
        .map((item) => {
          if (!item) return "";
          if (typeof item === "string") return item;
          return item.label || item.name || "";
        })
        .filter(Boolean)
        .join(", ")
    : "";

  return buildCaptureFrameSummary({
    roomType,
    frameSummary: detectedItemSummary || frameSummary,
  });
};

const extractBackendFrameSummary = (response) => {
  const summaryCandidate =
    response?.frameSummary ||
    response?.summary ||
    response?.inputPrompt ||
    response?.render?.inputPrompt ||
    "";

  return String(summaryCandidate || "").trim();
};

const extractBackendDetectedItems = (response) => {
  const rawItems =
    response?.detectedItems || response?.frameItems || response?.items;

  if (!Array.isArray(rawItems)) {
    logCaptureDetection("render-response:no-detected-items-array", {
      hasResponse: Boolean(response),
      keys: response ? Object.keys(response) : [],
    });
    return [];
  }

  const detectedItems = rawItems
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.label || item.name || item.type || "").trim();
      }
      return "";
    })
    .filter(Boolean);

  logCaptureDetection("render-response:detected-items", {
    rawCount: rawItems.length,
    detectedCount: detectedItems.length,
    detectedItems,
  });

  return detectedItems;
};

const extractProjectJson = (project) =>
  project?.projectJson || project?.data || project?.sceneData || null;

const getProjectDocumentId = (project) =>
  project?.projectId || project?._id || project?.id || null;

const getProjectDisplayTitle = (project) => {
  const title = String(project?.title || "").trim();
  return title || "Untitled Project";
};

const formatProjectSavedDate = (project) => {
  const rawDate = project?.lastSavedAt || project?.updatedAt || project?.createdAt;
  if (!rawDate) return "";

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const buildFrameItemsFromNames = (rawNames = []) => {
  const counts = new Map();

  rawNames
    .map((name) => humanizeElementName(name))
    .filter(Boolean)
    .forEach((name) => {
      counts.set(name, (counts.get(name) || 0) + 1);
    });

  return Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
    label: count > 1 ? `${name} x${count}` : name,
  }));
};

const buildRenderPreviewStateFromViewer2D = (plannerState) => {
  if (!plannerState?.get) return null;

  const viewer2D = plannerState.get("viewer2D");
  const scene = plannerState.get("scene");
  const viewerValue =
    viewer2D && typeof viewer2D.toJS === "function"
      ? viewer2D.toJS()
      : viewer2D || {};
  const sceneHeight = Number(
    scene?.get?.("height") ||
      scene?.height ||
      viewerValue.SVGHeight ||
      0,
  );
  const scale = Number(viewerValue.a || viewerValue.d || 1);
  const viewerWidth = Number(viewerValue.viewerWidth || 0);
  const viewerHeight = Number(viewerValue.viewerHeight || 0);
  const translateX = Number(viewerValue.e || 0);
  const translateY = Number(viewerValue.f || 0);

  if (
    !Number.isFinite(scale) ||
    Math.abs(scale) < 1e-6 ||
    !Number.isFinite(viewerWidth) ||
    !Number.isFinite(viewerHeight) ||
    !Number.isFinite(sceneHeight)
  ) {
    return null;
  }

  const svgCenterX = (viewerWidth / 2 - translateX) / scale;
  const svgCenterY = (viewerHeight / 2 - translateY) / scale;
  const planCenterY = sceneHeight - svgCenterY;

  if (!Number.isFinite(svgCenterX) || !Number.isFinite(planCenterY)) {
    return null;
  }

  const eyeY = convertMmToViewerUnits(1700);
  return {
    position: {
      x: svgCenterX,
      y: eyeY,
      z: -planCenterY,
    },
    target: {
      x: svgCenterX,
      y: eyeY,
      z: -planCenterY - 220,
    },
    source: "first-person",
  };
};

const logCaptureDetection = (stage, details = {}) => {
  if (typeof console === "undefined" || !console.log) return;
  console.log("[RenderCapture:item-detection]", stage, details);
};

const getSelectedLayerWallHeightMm = (
  plannerState,
  fallbackMm = RENDER_CAMERA_HEIGHT_MM_MAX,
) => {
  if (!plannerState?.get) return fallbackMm;

  const scene = plannerState.get("scene");
  if (!scene?.get) return fallbackMm;

  const selectedLayerId = scene.get("selectedLayer");
  if (!selectedLayerId) return fallbackMm;

  const lines = scene.getIn(["layers", selectedLayerId, "lines"]);
  if (!lines?.forEach || lines.size === 0) return fallbackMm;

  let maxWallHeightCm = 0;
  lines.forEach((line) => {
    const rawHeightCm = line?.getIn?.(["properties", "height", "length"]);
    const numericHeightCm = Number(rawHeightCm);
    if (!Number.isNaN(numericHeightCm) && numericHeightCm > maxWallHeightCm) {
      maxWallHeightCm = numericHeightCm;
    }
  });

  const maxWallHeightMm = Math.round(maxWallHeightCm * 10);
  if (
    !Number.isFinite(maxWallHeightMm) ||
    maxWallHeightMm <= RENDER_CAMERA_HEIGHT_MM_MIN
  ) {
    return fallbackMm;
  }

  return maxWallHeightMm;
};

const createThumbnailDataUrl = (
  sourceDataUrl,
  maxWidth = 260,
  quality = 0.76,
) => {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => resolve(sourceDataUrl);
    image.src = sourceDataUrl;
  });
};

const extractCloudModelTypesFromPlannerScene = (plannerScene) => {
  if (!plannerScene?.get) {
    return [];
  }

  const cloudModelTypes = new Set();
  const layers = plannerScene.get("layers");
  if (!layers?.forEach) {
    return [];
  }

  layers.forEach((layer) => {
    const items = layer?.get?.("items");
    if (!items?.forEach) {
      return;
    }

    items.forEach((item) => {
      const itemType = String(item?.get?.("type") || item?.type || "").trim();
      if (itemType.startsWith("cloud-model-")) {
        cloudModelTypes.add(itemType);
      }
    });
  });

  return Array.from(cloudModelTypes);
};

// Wrapper component that uses the hook and passes translator to class component
const MainDesignWorkspaceWithTranslator = (props) => {
  const { translator, currentLocale } = useTranslator();

  // Memoize context value to prevent unnecessary re-renders of all usePlanner() consumers.
  // Without this, every Redux dispatch creates a new object reference, forcing Viewer2D
  // and all other context consumers to re-render even when actions haven't changed.
  // The standalone react-planner avoids this by using legacy context (childContextTypes)
  // which doesn't trigger consumer re-renders on value change.
  const plannerContextValue = useMemo(
    () => ({
      projectActions: props.projectActions,
      linesActions: props.linesActions,
      holesActions: props.holesActions,
      viewer3DActions: props.viewer3DActions,
      viewer2DActions: props.viewer2DActions,
      sceneActions: props.sceneActions,
      verticesActions: props.verticesActions,
      itemsActions: props.itemsActions,
      areaActions: props.areaActions,
      groupsActions: props.groupsActions,
      textureActions: props.textureActions,
      translator: translator,
      catalog: props.catalog || MyCatalog,
    }),
    [
      props.projectActions,
      props.linesActions,
      props.holesActions,
      props.viewer3DActions,
      props.viewer2DActions,
      props.sceneActions,
      props.verticesActions,
      props.itemsActions,
      props.areaActions,
      props.groupsActions,
      props.textureActions,
      translator,
      props.catalog,
    ],
  );

  return (
    <PlannerProvider value={plannerContextValue}>
      <MainDesignWorkspaceInner
        {...props}
        translator={translator}
        currentLocale={currentLocale}
      />
    </PlannerProvider>
  );
};

const MainDesignWorkspaceInner = ({
  state,
  projectActions,
  linesActions,
  holesActions,
  viewer3DActions,
  itemsActions,
  textureActions,
}) => {
  const { t } = useTranslator();
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  const [activeTab, setActiveTab] = useState(null);
  const [workspaceMode, setWorkspaceMode] = useState("2d");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewSettings, setViewSettings] = useState({
    autoHideWalls: true,
    walls: true,
    furniture: true,
    doors: true,
    windows: true,
    grid: true,
    helpers: true,
    markers: true,
    guides: true,
    boundingBoxes: false,
  });
  const viewMenuRef = useRef(null);
  const cloudModelHydrationRef = useRef({
    inFlight: new Set(),
    resolved: new Set(),
    failed: new Set(),
  });
  const hasHydratedCloudCatalogRef = useRef(false);
  const [plannerUser, setPlannerUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState("");
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState("");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectPickerProjects, setProjectPickerProjects] = useState([]);
  const [projectPickerLoading, setProjectPickerLoading] = useState(false);
  const [projectPickerError, setProjectPickerError] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [saveNameDialogOpen, setSaveNameDialogOpen] = useState(false);
  const [saveProjectTitleDraft, setSaveProjectTitleDraft] = useState("");
  const [saveNameError, setSaveNameError] = useState("");
  const [renderSubMode, setRenderSubMode] = useState("walkthrough");
  const [renderControlType, setRenderControlType] = useState("drag-pan");
  const [cameraHeightMm, setCameraHeightMm] = useState(1700);
  const [cameraVerticalRotation, setCameraVerticalRotation] = useState(0);
  const [capturedImages, setCapturedImages] = useState([]);
  const [selectedCaptureId, setSelectedCaptureId] = useState(null);
  const [previewCaptureId, setPreviewCaptureId] = useState(null);
  const [selectedRenderQuality, setSelectedRenderQuality] = useState("2k");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [isRenderLeftSidebarCollapsed, setIsRenderLeftSidebarCollapsed] =
    useState(false);
  const [isCaptureFlashActive, setIsCaptureFlashActive] = useState(false);
  const [isCapturePulseActive, setIsCapturePulseActive] = useState(false);
  const [newestCaptureId, setNewestCaptureId] = useState(null);
  const [renderErrorMessage, setRenderErrorMessage] = useState("");
  const [renderSuccessMessage, setRenderSuccessMessage] = useState("");
  const [renderPromptDialog, setRenderPromptDialog] = useState(null);
  const [cloudModelsByCategory, setCloudModelsByCategory] = useState({});
  const [cloudModelCategoryTree, setCloudModelCategoryTree] = useState([]);
  const [cloudModelPaginationByCategory, setCloudModelPaginationByCategory] =
    useState({});
  const [cloudModelsLoadingByCategory, setCloudModelsLoadingByCategory] =
    useState({});
  const [cloudModelErrorsByCategory, setCloudModelErrorsByCategory] =
    useState({});
  const [plannerTextures, setPlannerTextures] = useState({
    wall: [],
    floor: [],
  });
  const [plannerTextureCategories, setPlannerTextureCategories] = useState([]);
  const [plannerTexturesByCategory, setPlannerTexturesByCategory] = useState({});
  const [plannerTexturePaginationByCategory, setPlannerTexturePaginationByCategory] =
    useState({});
  const [plannerTexturesLoadingByCategory, setPlannerTexturesLoadingByCategory] =
    useState({});
  const [plannerTextureErrorsByCategory, setPlannerTextureErrorsByCategory] =
    useState({});
  const [plannerTexturesLoading, setPlannerTexturesLoading] = useState(false);
  const [plannerTexturesError, setPlannerTexturesError] = useState("");
  const renderViewerSyncRef = useRef({
    viewer: null,
    isRenderTabActive: null,
    renderSubMode: null,
    renderControlType: null,
    cameraHeightMm: null,
    maxCameraHeightMm: null,
    cameraVerticalRotation: null,
  });
  const latestProjectJsonRef = useRef(null);
  const latestProjectHashRef = useRef("");
  const initialProjectHashRef = useRef("");
  const lastSavedProjectHashRef = useRef("");
  const lastSavedProjectTitleRef = useRef("");
  const saveRequestInFlightRef = useRef(false);
  const currentProjectIdRef = useRef(null);
  const currentProjectTitleRef = useRef("");
  const hasUserAdjustedRenderCameraHeightRef = useRef(false);
  const hasUserAdjustedRenderCameraVerticalRotationRef = useRef(false);
  const isAuthenticatedRef = useRef(false);
  const cloudModelCategoryRequestSeqRef = useRef(new Map());
  const cloudModelCategoryInFlightRef = useRef(new Set());
  const plannerTexturesRequestSeqRef = useRef(0);
  const activeTabRef = useRef(null);
  const hasOpenedOrbit3DRef = useRef(false);

  const plannerState = state ? state.get("react-planner") : null;
  const isRenderTabActive = activeTab === "render";

  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  useEffect(() => {
    currentProjectTitleRef.current = currentProjectTitle;
  }, [currentProjectTitle]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const scene = plannerState?.get?.("scene");
    if (!scene?.toJS) return;

    const projectJson = scene.toJS();
    const projectHash = JSON.stringify(projectJson);
    latestProjectJsonRef.current = projectJson;
    latestProjectHashRef.current = projectHash;
    if (!initialProjectHashRef.current) {
      initialProjectHashRef.current = projectHash;
    }
  }, []);

  const previewCapture = useMemo(() =>
      capturedImages.find((capture) => capture.id === previewCaptureId) || null,
    [capturedImages, previewCaptureId],
  );
  const processingCaptureCount = useMemo(() =>
      capturedImages.filter(
        (capture) => capture.status === CAPTURE_STATUS_PROCESSING,
      ).length,
    [capturedImages],
  );
  const selectedCapture = useMemo(
    () =>
      capturedImages.find((capture) => capture.id === selectedCaptureId) ||
      null,
    [capturedImages, selectedCaptureId],
  );
  const isPreviewCapturePendingRender = Boolean(
    previewCapture &&
      (previewCapture.status === CAPTURE_STATUS_CAPTURED ||
        previewCapture.status === CAPTURE_STATUS_FAILED),
  );
  const captureSummaryText = useMemo(() => {
    if (!selectedCapture) {
      return "";
    }

    if (selectedCapture.backendFrameSummary) {
      return selectedCapture.backendFrameSummary;
    }

    if (selectedCapture.frameSummary) {
      return selectedCapture.frameSummary;
    }

    if (
      Array.isArray(selectedCapture.detectedItems) &&
      selectedCapture.detectedItems.length > 0
    ) {
      return selectedCapture.detectedItems.join(", ");
    }

    if (selectedCapture.status === CAPTURE_STATUS_PROCESSING) {
      return t("Waiting for backend response");
    }

    if (selectedCapture.status === CAPTURE_STATUS_FAILED) {
      return selectedCapture.errorMessage || t("Processing failed");
    }

    if (selectedCapture.status === CAPTURE_STATUS_READY) {
      return t("Render ready.");
    }

    return "";
  }, [selectedCapture, t]);
  const previewSummaryText =
    previewCapture?.frameSummary ||
    previewCapture?.backendFrameSummary ||
    captureSummaryText;
  const maxCameraHeightMm = useMemo(
    () => getSelectedLayerWallHeightMm(plannerState),
    [plannerState],
  );

  const seedRenderCameraFromCurrent2DView = useCallback(() => {
    const previewState = buildRenderPreviewStateFromViewer2D(plannerState);
    if (!previewState) return;

    const viewer = typeof window !== "undefined" ? window.__viewer3D : null;
    if (viewer && typeof viewer.setRenderPreviewState === "function") {
      viewer.setRenderPreviewState(previewState);
    }

    if (typeof window !== "undefined") {
      window[SHARED_CAMERA_TRANSITION_STATE_KEY] = previewState;
    }
  }, [plannerState]);

  const handleExitRenderView = useCallback(() => {
    setActiveTab(null);
    setRenderSubMode("walkthrough");
    setRenderControlType("drag-pan");
    setPreviewCaptureId(null);
    setRenderErrorMessage("");
    setRenderSuccessMessage("");
    viewer3DActions.selectTool3DView();
    setWorkspaceMode("3d");
  }, [viewer3DActions]);

  useEffect(() => {
    const handleRenderEscape = (event) => {
      if (!isRenderTabActive) return;
      if (event.key !== "Escape") return;

      event.preventDefault();
      handleExitRenderView();
    };

    window.addEventListener("keydown", handleRenderEscape);
    return () => window.removeEventListener("keydown", handleRenderEscape);
  }, [isRenderTabActive, handleExitRenderView]);

  useEffect(() => {
    let cancelled = false;

    const loadAuthProfile = async () => {
      try {
        const user = await getPlannerUserProfile();
        if (cancelled) return;

        if (user) {
          setPlannerUser(user);
          setIsAuthenticated(true);
        } else {
          setPlannerUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setHasResolvedAuth(true);
        }
      }
    };

    loadAuthProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestCloudModels = useCallback(async (category, options = {}) => {
    const normalizedCategory = normalizeCloudModelCategory(category);
    const normalizedSubCategory = normalizeCloudModelSubcategory(
      options.subCategory || options.sub_category,
    );
    const categoryCacheKey = getCloudModelCategoryCacheKey(
      normalizedCategory,
      normalizedSubCategory,
    );
    const append = Boolean(options.append);
    const page =
      options.page ||
      (append
        ? (cloudModelPaginationByCategory[categoryCacheKey]?.page || 0) + 1
        : 1);
    if (!normalizedCategory) {
      return [];
    }
    if (cloudModelsLoadingByCategory[categoryCacheKey]) {
      return cloudModelsByCategory[categoryCacheKey] || [];
    }
    if (cloudModelCategoryInFlightRef.current.has(categoryCacheKey)) {
      return cloudModelsByCategory[categoryCacheKey] || [];
    }
    if (
      append &&
      cloudModelPaginationByCategory[categoryCacheKey]?.hasMore === false
    ) {
      return cloudModelsByCategory[categoryCacheKey] || [];
    }

    const requestSeq =
      (cloudModelCategoryRequestSeqRef.current.get(categoryCacheKey) || 0) + 1;
    cloudModelCategoryRequestSeqRef.current.set(categoryCacheKey, requestSeq);
    cloudModelCategoryInFlightRef.current.add(categoryCacheKey);

    
    setCloudModelErrorsByCategory((currentErrors) => ({
      ...currentErrors,
      [categoryCacheKey]: "",
    }));
    setCloudModelsLoadingByCategory((currentLoadingState) => ({
      ...currentLoadingState,
      [categoryCacheKey]: true,
    }));

    try {
      const { models, pagination } = await fetchCloudModelsByCategoryPage(
        normalizedCategory,
        {
          subCategory: normalizedSubCategory,
          page,
          limit: CLOUD_MODEL_PAGE_SIZE,
        },
      );
      const { didRegisterAny } = ensureCloudModelsRegistered(MyCatalog, models);
      

      if (didRegisterAny) {
        projectActions?.initCatalog?.(MyCatalog);
      }

      if (
        cloudModelCategoryRequestSeqRef.current.get(categoryCacheKey) ===
          requestSeq &&
        activeTabRef.current === "models"
      ) {
        setCloudModelsByCategory((currentModels) => ({
          ...currentModels,
          [categoryCacheKey]: append
            ? [
                ...(currentModels[categoryCacheKey] || []).filter(
                  (model) => !models.some((nextModel) => nextModel.id === model.id),
                ),
                ...models,
              ]
            : models,
        }));
        setCloudModelPaginationByCategory((currentPagination) => ({
          ...currentPagination,
          [categoryCacheKey]: pagination,
        }));
      }
      return models;
    } catch (error) {
      
      if (
        cloudModelCategoryRequestSeqRef.current.get(categoryCacheKey) ===
          requestSeq &&
        activeTabRef.current === "models"
      ) {
        setCloudModelErrorsByCategory((currentErrors) => ({
          ...currentErrors,
          [categoryCacheKey]:
            error?.message || "Failed to load cloud models for this category.",
        }));
      }
      return [];
    } finally {
      cloudModelCategoryInFlightRef.current.delete(categoryCacheKey);
      if (
        cloudModelCategoryRequestSeqRef.current.get(categoryCacheKey) ===
          requestSeq &&
        activeTabRef.current === "models"
      ) {
        setCloudModelsLoadingByCategory((currentLoadingState) => ({
          ...currentLoadingState,
          [categoryCacheKey]: false,
        }));
      }
    }
  }, [
    cloudModelPaginationByCategory,
    cloudModelsByCategory,
    cloudModelsLoadingByCategory,
    projectActions,
  ]);

  const hydrateCloudCatalogFromDatabase = useCallback(async () => {
    if (hasHydratedCloudCatalogRef.current) {
      return;
    }

    try {
      const categoryTree = await fetchCloudModelCategoryTree();
      const categories = categoryTree.map((category) => category.key);
      setCloudModelCategoryTree(categoryTree);
      setCloudModelsByCategory((currentModels) => ({
        ...currentModels,
        ...categories.reduce((accumulator, category) => {
          if (!Array.isArray(currentModels[category])) {
            accumulator[category] = [];
          }
          return accumulator;
        }, {}),
      }));

      hasHydratedCloudCatalogRef.current = true;
    } catch (categoryError) {
      try {
        const categories = await fetchCloudModelCategories();
        setCloudModelCategoryTree(
          categories.map((category) => ({
            key: category,
            label: category,
            subcategories: [],
          })),
        );
        setCloudModelsByCategory((currentModels) => ({
          ...currentModels,
          ...categories.reduce((accumulator, category) => {
            if (!Array.isArray(currentModels[category])) {
              accumulator[category] = [];
            }
            return accumulator;
          }, {}),
        }));
      } catch (_) {
      }
    }
  }, [projectActions]);

  useEffect(() => {
    if (activeTab !== "models") return;
    hydrateCloudCatalogFromDatabase();
  }, [activeTab, hydrateCloudCatalogFromDatabase]);

  const hydratePlannerTextures = useCallback(
    async (options = {}) => {
      const { force = false } = options;
      const sidebarRequest = Boolean(options.sidebarRequest);
      const requestSeq = plannerTexturesRequestSeqRef.current + 1;
      plannerTexturesRequestSeqRef.current = requestSeq;

      
      setPlannerTexturesLoading(true);
      setPlannerTexturesError("");

      try {
        const categories = await fetchCloudTextureCategories({ force });

        

        if (
          plannerTexturesRequestSeqRef.current === requestSeq &&
          (!sidebarRequest || activeTabRef.current === "models")
        ) {
          setPlannerTextureCategories(categories);
        }

        return categories;
      } catch (error) {
        
        if (
          plannerTexturesRequestSeqRef.current === requestSeq &&
          (!sidebarRequest || activeTabRef.current === "models")
        ) {
          setPlannerTexturesError(
            error?.message || "Failed to load planner textures.",
          );
        }
        return [];
      } finally {
        if (
          plannerTexturesRequestSeqRef.current === requestSeq &&
          (!sidebarRequest || activeTabRef.current === "models")
        ) {
          setPlannerTexturesLoading(false);
        }
      }
    },
    [],
  );

  const handleRequestPlannerTextures = useCallback(
    async (category, options = {}) => {
      const normalizedCategory = String(category || "").trim().toLowerCase();
      if (!normalizedCategory) return [];

      const append = Boolean(options.append);
      const page =
        options.page ||
        (append
          ? (plannerTexturePaginationByCategory[normalizedCategory]?.page || 0) + 1
          : 1);

      setPlannerTextureErrorsByCategory((currentErrors) => ({
        ...currentErrors,
        [normalizedCategory]: "",
      }));
      setPlannerTexturesLoadingByCategory((currentLoadingState) => ({
        ...currentLoadingState,
        [normalizedCategory]: true,
      }));

      try {
        const { textures, pagination } = await fetchCloudTexturesByCategoryPage(
          normalizedCategory,
          {
            page,
            limit: CLOUD_TEXTURE_PAGE_SIZE,
          },
        );
        const didUpdateCatalog = syncCloudTexturesIntoCatalog(MyCatalog, textures);

        if (didUpdateCatalog) {
          projectActions?.initCatalog?.(MyCatalog);
        }

        const mergeCategoryTextures = (currentTextures = {}) => ({
          ...currentTextures,
          [normalizedCategory]: dedupeTexturesBySourceId(
            append
              ? [...(currentTextures[normalizedCategory] || []), ...textures]
              : textures,
          ),
        });

        setPlannerTexturesByCategory(mergeCategoryTextures);
        setPlannerTexturePaginationByCategory((currentPagination) => ({
          ...currentPagination,
          [normalizedCategory]: pagination,
        }));

        setPlannerTextures((currentTextures) => {
          const nextTexturesByCategory = mergeCategoryTextures(
            plannerTexturesByCategory,
          );
          const allLoadedTextures = dedupeTexturesBySourceId(
            Object.values(nextTexturesByCategory).flat(),
          );

          return {
            ...currentTextures,
            wall: allLoadedTextures
              .map((texture) => ({
                ...texture,
                id: `wall-${texture.id}`,
                textureKey: texture.id,
                targetType: "both",
              })),
            floor: allLoadedTextures
              .map((texture) => ({
                ...texture,
                id: `floor-${texture.id}`,
                textureKey: texture.id,
                targetType: "both",
              })),
          };
        });

        return textures;
      } catch (error) {
        setPlannerTextureErrorsByCategory((currentErrors) => ({
          ...currentErrors,
          [normalizedCategory]:
            error?.message || "Failed to load planner textures.",
        }));
        return [];
      } finally {
        setPlannerTexturesLoadingByCategory((currentLoadingState) => ({
          ...currentLoadingState,
          [normalizedCategory]: false,
        }));
      }
    },
    [plannerTexturePaginationByCategory, plannerTexturesByCategory, projectActions],
  );

  const rehydratePlannerTexturesForScene = useCallback(
    async (sceneData, options = {}) => {
      const textureKeys = extractCloudTextureKeysFromSceneData(sceneData);
      if (textureKeys.length === 0) {
        return;
      }

      const textures = await fetchCloudTexturesByIds(textureKeys, {
        force: Boolean(options.force),
      });
      const didUpdateCatalog = syncCloudTexturesIntoCatalog(MyCatalog, textures);
      if (didUpdateCatalog) {
        projectActions?.initCatalog?.(MyCatalog);
      }
    },
    [projectActions],
  );

  const handleCloudModelSelect = useCallback(
    (model, { isIn3DView = false } = {}) => {
      if (!model?.type) return;

      const registeredModel = ensureCloudModelRegistered(MyCatalog, model);
      const persistedItemData = createPlannerItemAssetPayload(registeredModel);
      if (registeredModel.didRegister) {
        projectActions?.initCatalog?.(MyCatalog);
      }

      warmCloudModelSelection(registeredModel);

      if (isIn3DView) {
        itemsActions?.selectToolDrawingItem3D(
          registeredModel.type,
          persistedItemData,
        );
      } else {
        itemsActions?.selectToolDrawingItem(
          registeredModel.type,
          persistedItemData,
        );
      }
    },
    [itemsActions, projectActions],
  );

  const rehydrateCloudModelsForScene = useCallback(
    async (sceneData, options = {}) => {
      const { force = false } = options;
      const cloudModelTypes = sceneData?.get
        ? extractCloudModelTypesFromPlannerScene(sceneData)
        : extractCloudModelTypesFromSceneData(sceneData);
      if (cloudModelTypes.length === 0) {
        return;
      }

      const hydrationState = cloudModelHydrationRef.current;
      const typesToFetch = cloudModelTypes.filter((type) => {
        if (!type?.startsWith?.("cloud-model-")) {
          return false;
        }

        if (MyCatalog.hasElement(type)) {
          hydrationState.resolved.add(type);
          hydrationState.failed.delete(type);
          return false;
        }

        if (force) {
          hydrationState.failed.delete(type);
        }

        if (hydrationState.inFlight.has(type)) {
          return false;
        }

        if (
          !force &&
          (hydrationState.resolved.has(type) || hydrationState.failed.has(type))
        ) {
          return false;
        }

        return true;
      });

      if (typesToFetch.length === 0) {
        return;
      }

      typesToFetch.forEach((type) => hydrationState.inFlight.add(type));

      try {
        const matchingModels = await fetchCloudModelsByTypes(typesToFetch);
        const { models, didRegisterAny } = ensureCloudModelsRegistered(
          MyCatalog,
          matchingModels,
        );

        models.forEach((model) => warmCloudModelSelection(model));

        const resolvedTypes = new Set(models.map((model) => model.type));
        typesToFetch.forEach((type) => {
          if (resolvedTypes.has(type) || MyCatalog.hasElement(type)) {
            hydrationState.resolved.add(type);
            hydrationState.failed.delete(type);
          } else {
            hydrationState.failed.add(type);
          }
        });

        if (didRegisterAny) {
          projectActions?.initCatalog?.(MyCatalog);
        }
      } finally {
        typesToFetch.forEach((type) => hydrationState.inFlight.delete(type));
      }
    },
    [projectActions],
  );

  const plannerScene = plannerState ? plannerState.get("scene") : null;

  useEffect(() => {
    if (!plannerScene) return;

    rehydrateCloudModelsForScene(plannerScene).catch(() => {});
  }, [plannerScene, rehydrateCloudModelsForScene]);

  useEffect(() => {
    if (!plannerScene) return;

    rehydratePlannerTexturesForScene(plannerScene).catch(() => {});
  }, [plannerScene, rehydratePlannerTexturesForScene]);

  const loadProjectDocument = useCallback(
    async (project, { fallbackProjectId = null, navigateToProject = false } = {}) => {
      if (!projectActions) return null;

      const projectJson = extractProjectJson(project);
      if (!projectJson) {
        throw new Error("Project data is missing.");
      }

      await Promise.all([
        rehydrateCloudModelsForScene(projectJson, { force: true }).catch(() => {}),
        rehydratePlannerTexturesForScene(projectJson).catch(() => {}),
      ]);

      projectActions.loadProject(projectJson);

      const resolvedProjectId =
        getProjectDocumentId(project) || fallbackProjectId || null;
      if (resolvedProjectId) {
        setCurrentProjectId(resolvedProjectId);
        currentProjectIdRef.current = resolvedProjectId;
        if (navigateToProject && resolvedProjectId !== routeProjectId) {
          navigate(`/planner/${resolvedProjectId}`, { replace: true });
        }
      }

      const resolvedProjectTitle = getProjectDisplayTitle(project);
      setCurrentProjectTitle(resolvedProjectTitle);
      currentProjectTitleRef.current = resolvedProjectTitle;
      const loadedHash = JSON.stringify(projectJson);
      initialProjectHashRef.current = loadedHash;
      lastSavedProjectHashRef.current = loadedHash;
      lastSavedProjectTitleRef.current = resolvedProjectTitle;
      latestProjectJsonRef.current = projectJson;
      latestProjectHashRef.current = loadedHash;
      setSaveStatus("idle");
      setSaveErrorMessage("");
      setSaveNameDialogOpen(false);
      setSaveNameError("");
      return resolvedProjectId;
    },
    [
      navigate,
      projectActions,
      rehydrateCloudModelsForScene,
      rehydratePlannerTexturesForScene,
      routeProjectId,
    ],
  );

  useEffect(() => {
    if (!hasResolvedAuth || !routeProjectId || !projectActions) return undefined;

    if (
      routeProjectId === currentProjectIdRef.current &&
      latestProjectJsonRef.current
    ) {
      return undefined;
    }

    let cancelled = false;

    const loadProjectFromRoute = async () => {
      if (!isAuthenticated) {
        setProjectLoadError("Please sign in to open this project.");
        return;
      }

      setIsProjectLoading(true);
      setProjectLoadError("");

      try {
        const project = await getProjectById(routeProjectId);
        if (cancelled) return;

        await loadProjectDocument(project, {
          fallbackProjectId: routeProjectId,
        });
      } catch (error) {
        if (!cancelled) {
          setProjectLoadError(error?.message || "Failed to load project.");
        }
      } finally {
        if (!cancelled) {
          setIsProjectLoading(false);
        }
      }
    };

    loadProjectFromRoute();

    return () => {
      cancelled = true;
    };
  }, [
    hasResolvedAuth,
    isAuthenticated,
    loadProjectDocument,
    projectActions,
    routeProjectId,
  ]);

  useEffect(() => {
    if (activeTab !== "models") return;

    hydratePlannerTextures({ sidebarRequest: true }).catch(() => {});
  }, [activeTab, hydratePlannerTextures]);

  // ──── Sync local workspaceMode with Redux mode (very important) ────
  const reduxMode = plannerState ? plannerState.get("mode") : null;
  const selectedTexturePreview = useMemo(() => {
    if (reduxMode !== MODE_APPLYING_TEXTURE || !plannerState) {
      return null;
    }

    const textureApplication = plannerState.get("textureApplication");
    const textureKey = textureApplication?.get?.("textureKey");
    const targetType = textureApplication?.get?.("targetType");
    if (!textureKey) return null;

    const texturePool =
      targetType === "floor"
        ? plannerTextures.floor
        : targetType === "wall"
          ? plannerTextures.wall
          : [...plannerTextures.wall, ...plannerTextures.floor];
    const texture = texturePool.find(
      (entry) => entry.textureKey === textureKey || entry.id === textureKey,
    );

    if (!texture) return null;

    return {
      ...texture,
      src:
        texture.thumbnailUrl ||
        texture.image ||
        texture.maps?.Color ||
        texture.uri ||
        "",
    };
  }, [plannerState, plannerTextures, reduxMode]);

  useEffect(() => {
    if (selectedTexturePreview) {
      preloadPlannerTextureDefinition(selectedTexturePreview);
    }
  }, [selectedTexturePreview]);

  useEffect(() => {
    if (!reduxMode) return;
    if (
      reduxMode === MODE_3D_VIEW ||
      reduxMode === "MODE_DRAWING_ITEM_3D" ||
      reduxMode === "MODE_DRAGGING_ITEM_3D" ||
      reduxMode === "MODE_DRAWING_HOLE_3D" ||
      reduxMode === "MODE_DRAGGING_HOLE_3D" ||
      reduxMode === MODE_APPLYING_TEXTURE ||
      reduxMode === "MODE_3D_MEASURE"
    ) {
      hasOpenedOrbit3DRef.current = true;
      setWorkspaceMode("3d");
    } else if (reduxMode === MODE_3D_FIRST_PERSON) {
      setWorkspaceMode("3d-firstperson");
    } else {
      // All other modes are 2D modes
      if (workspaceMode !== "2d") setWorkspaceMode("2d");
    }
  }, [reduxMode]);

  // Close view dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        viewOpen &&
        viewMenuRef.current &&
        !viewMenuRef.current.contains(e.target)
      )
        setViewOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [viewOpen]);

  const handleTabChange = (tabId) => {
    if (tabId === "render") {
      if (activeTab === "render") {
        handleExitRenderView();
        return;
      }

      if (!hasOpenedOrbit3DRef.current) {
        seedRenderCameraFromCurrent2DView();
      }
      viewer3DActions.selectTool3DFirstPerson();
      setWorkspaceMode("3d-firstperson");
      setRenderSubMode("walkthrough");
      setRenderControlType("drag-pan");
      setActiveTab("render");
    } else {
      if (activeTab === "render") {
        viewer3DActions.selectTool3DView();
        setWorkspaceMode("3d");
      }
      if (tabId === "models" && activeTab !== "models") {
      }
      setActiveTab(activeTab === tabId ? null : tabId);
    }
  };

  const handleCloseSidebar = () => {
    if (activeTab === "render") {
      handleExitRenderView();
      return;
    }
    setActiveTab(null);
  };

  const getSidebarWidth = () => {
    const readSidebarWidth = (selector, fallbackWidth) => {
      if (typeof document === "undefined") return fallbackWidth;
      const sidebarElement = document.querySelector(selector);
      const measuredWidth = sidebarElement?.getBoundingClientRect?.().width;
      return Number.isFinite(measuredWidth) ? measuredWidth : fallbackWidth;
    };

    switch (activeTab) {
      case "floorplan":
        return readSidebarWidth(".floorplan-sidebar", 288);
      case "models":
        return readSidebarWidth(".models-sidebar", 460);
      case "gallery":
        return 384;
      case "advanced":
        return 320;
      case "render":
        return 568;
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (!isRenderTabActive) return;

    if (window.__RENDER_DEBUG__) {
    
    }

    viewer3DActions.selectTool3DFirstPerson();
    setWorkspaceMode("3d-firstperson");
    setRenderSubMode("walkthrough");
  }, [isRenderTabActive, viewer3DActions]);

  useEffect(() => {
    const onControlTypeFallback = (event) => {
      if (!event?.detail) return;
      setRenderControlType(event.detail);
    };

    window.addEventListener(
      "render-control-type-change",
      onControlTypeFallback,
    );
    return () => {
      window.removeEventListener(
        "render-control-type-change",
        onControlTypeFallback,
      );
    };
  }, []);

  useEffect(() => {
    const onVerticalRotationChange = (event) => {
      if (!isRenderTabActive) return;
      const nextValue = Math.round(
        clampNumber(
          event?.detail,
          RENDER_VERTICAL_ROTATION_MIN,
          RENDER_VERTICAL_ROTATION_MAX,
        ),
      );
      setCameraVerticalRotation((currentValue) =>
        Math.abs(currentValue - nextValue) < 0.0001 ? currentValue : nextValue,
      );
    };

    window.addEventListener(
      "render-camera-vertical-rotation-change",
      onVerticalRotationChange,
    );
    return () => {
      window.removeEventListener(
        "render-camera-vertical-rotation-change",
        onVerticalRotationChange,
      );
    };
  }, [isRenderTabActive]);

  useEffect(() => {
    const applyRenderStateToViewer = () => {
      const viewer = window.__viewer3D;
      if (!viewer) return false;
      const syncState = renderViewerSyncRef.current;

      if (syncState.viewer !== viewer) {
        syncState.viewer = viewer;
        syncState.isRenderTabActive = null;
        syncState.renderSubMode = null;
        syncState.renderControlType = null;
        syncState.cameraHeightMm = null;
        syncState.maxCameraHeightMm = null;
        syncState.cameraVerticalRotation = null;
      }

      if (isRenderTabActive) {
        const becameActive = syncState.isRenderTabActive !== true;

        if (becameActive || syncState.renderSubMode !== renderSubMode) {
          viewer.setRenderInteractionMode?.(renderSubMode);
        }

        if (becameActive || syncState.renderControlType !== renderControlType) {
          viewer.setRenderControlType?.(renderControlType);
        }

        if (becameActive || syncState.maxCameraHeightMm !== maxCameraHeightMm) {
          viewer.setRenderCameraHeightLimit?.(
            convertMmToViewerUnits(maxCameraHeightMm),
          );
        }

        if (
          hasUserAdjustedRenderCameraHeightRef.current &&
          (becameActive || syncState.cameraHeightMm !== cameraHeightMm)
        ) {
          viewer.setRenderCameraHeight?.(
            convertMmToViewerUnits(cameraHeightMm),
          );
        }

        if (
          hasUserAdjustedRenderCameraVerticalRotationRef.current &&
          (becameActive ||
          Math.abs(
            (syncState.cameraVerticalRotation ?? 0) - cameraVerticalRotation,
          ) > 0.0001
          )
        ) {
          viewer.setRenderCameraVerticalRotation?.(cameraVerticalRotation);
        }

        syncState.isRenderTabActive = true;
        syncState.renderSubMode = renderSubMode;
        syncState.renderControlType = renderControlType;
        syncState.maxCameraHeightMm = maxCameraHeightMm;
        syncState.cameraHeightMm = cameraHeightMm;
        syncState.cameraVerticalRotation = cameraVerticalRotation;

        
      } else {
        if (syncState.isRenderTabActive !== false) {
          viewer.setRenderInteractionMode?.("default");
          viewer.setRenderControlType?.("drag-pan");
        }

        syncState.isRenderTabActive = false;
        syncState.renderSubMode = null;
        syncState.renderControlType = null;
        syncState.maxCameraHeightMm = null;
        syncState.cameraHeightMm = null;
        syncState.cameraVerticalRotation = null;
      }

      return true;
    };

    if (applyRenderStateToViewer()) return;

    const retryInterval = window.setInterval(() => {
      if (applyRenderStateToViewer()) {
        window.clearInterval(retryInterval);
      }
    }, 220);

    const clearRetry = window.setTimeout(() => {
      window.clearInterval(retryInterval);
    }, 3000);

    return () => {
      window.clearInterval(retryInterval);
      window.clearTimeout(clearRetry);
    };
  }, [
    isRenderTabActive,
    renderSubMode,
    renderControlType,
    cameraHeightMm,
    cameraVerticalRotation,
    maxCameraHeightMm,
  ]);

  useEffect(() => {
    setCameraHeightMm((currentHeightMm) =>
      clampNumber(
        currentHeightMm,
        RENDER_CAMERA_HEIGHT_MM_MIN,
        maxCameraHeightMm,
      ),
    );
  }, [maxCameraHeightMm]);

  const handleCameraHeightChange = (value) => {
    hasUserAdjustedRenderCameraHeightRef.current = true;
    setCameraHeightMm(
      clampNumber(value, RENDER_CAMERA_HEIGHT_MM_MIN, maxCameraHeightMm),
    );
  };

  const handleCameraVerticalRotationChange = (value) => {
    hasUserAdjustedRenderCameraVerticalRotationRef.current = true;
    const nextValue = clampNumber(
      value,
      RENDER_VERTICAL_ROTATION_MIN,
      RENDER_VERTICAL_ROTATION_MAX,
    );
    setCameraVerticalRotation(Math.round(nextValue));
  };

  const captureCurrentFrame = useCallback(async () => {
    const normalizeItemNames = (names) =>
      Array.isArray(names)
        ? names.map((name) => String(name || "").trim()).filter(Boolean)
        : [];

    const getVisibleItemNames = (viewer) => {
      if (!viewer) return [];

      if (typeof viewer.getVisibleFrameItemNames === "function") {
        const names = normalizeItemNames(viewer.getVisibleFrameItemNames());
        logCaptureDetection("frame-scan:visible-items", {
          count: names.length,
          names,
        });
        return names;
      }

      logCaptureDetection("frame-scan:no-viewer-visible-item-api", {});
      return [];
    };

    let capturePayload = {
      imageDataUrl: "",
      // selectedItemNames: [],
      visibleItemNames: [],
      captureScope: "full",
    };

    for (
      let attempt = 0;
      attempt < 4 && !capturePayload.imageDataUrl;
      attempt += 1
    ) {
      const viewer = window.__viewer3D;
      const renderer = viewer?.renderer || window.__threeRenderer;

      logCaptureDetection("frame-capture:attempt", {
        attempt: attempt + 1,
        hasViewer: Boolean(viewer),
        hasRenderer: Boolean(renderer),
      });

      try {
        const visibleItemNames = getVisibleItemNames(viewer);
       // const selectedItemNames = normalizeItemNames(viewer.getSelectedFrameItemNames());
        const imageDataUrl = renderer?.domElement?.toDataURL?.("image/png");
        logCaptureDetection("frame-capture:canvas-read", {
          attempt: attempt + 1,
          hasImage: Boolean(imageDataUrl),
          visibleCount: visibleItemNames.length,
        });
        capturePayload = {
          imageDataUrl,
          //selectedItemNames,
          visibleItemNames,
          captureScope: visibleItemNames.length ? "visible" : "full",
        };
        logCaptureDetection("frame-capture:payload", capturePayload);
      } catch (captureError) {
        logCaptureDetection("frame-capture:error", {
          attempt: attempt + 1,
          error: captureError?.message || String(captureError),
        });
      }

      if (!capturePayload.imageDataUrl) {
        logCaptureDetection("frame-capture:retry", { attempt: attempt + 1 });
        await new Promise((resolve) =>
          window.requestAnimationFrame(() => resolve()),
        );
      }
    }

    return capturePayload;
  }, [plannerState]);

  const updateCaptureById = useCallback((captureId, updates) => {
    setCapturedImages((currentCaptures) =>
      currentCaptures.map((capture) =>
        capture.id === captureId
          ? {
              ...capture,
              ...(typeof updates === "function" ? updates(capture) : updates),
            }
          : capture,
      ),
    );
  }, []);

  const handleCapture = useCallback(async () => {
    if (!isRenderTabActive) return;

    setIsCapturePulseActive(true);
    setIsCaptureFlashActive(true);
    window.setTimeout(() => setIsCapturePulseActive(false), 260);
    window.setTimeout(() => setIsCaptureFlashActive(false), 130);

    if (typeof document !== "undefined" && document.pointerLockElement) {
      document.exitPointerLock?.();
    }

    const capturePayload = await captureCurrentFrame();
    const captureSource = capturePayload?.imageDataUrl || "";

    if (!captureSource) {
      setRenderErrorMessage(t("Failed to capture current frame"));
      return;
    }
    setRenderErrorMessage("");
    setRenderSuccessMessage("");

    const thumbnailUrl = await createThumbnailDataUrl(captureSource);
    const captureId = `capture-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = Date.now();
    const visibleFrameItems = buildFrameItemsFromNames(
      capturePayload?.visibleItemNames || [],
    );
    logCaptureDetection("frame-items:built", {
      rawNames: capturePayload?.visibleItemNames || [],
      builtItems: visibleFrameItems,
    });
    // const selectedFrameItems = buildFrameItemsFromNames(
    //   capturePayload?.selectedItemNames || [],
    // );
    // const frameItems =
    //   selectedFrameItems.length > 0
    //     ? selectedFrameItems
    //     : visibleFrameItems;
    const plannerFrameSummary = visibleFrameItems.map((item) => item.label).join(", ");
    const captureFrameSummary = buildCaptureFrameSummary({
      roomType: selectedRoomType,
      frameSummary: plannerFrameSummary,
    });

    logCaptureDetection("capture:summary", {
      plannerFrameSummary,
      captureFrameSummary,
      selectedRoomType,
      captureScope: capturePayload?.captureScope || "full",
    });

    setCapturedImages((currentCaptures) => [
      {
        id: captureId,
        status: CAPTURE_STATUS_CAPTURED,
        imageDataUrl: captureSource,
        sourceImageDataUrl: captureSource,
        thumbnailUrl,
        detectedItems: visibleFrameItems,
        frameSummary: captureFrameSummary,
        roomType: selectedRoomType,
        // renderQuality: selectedRenderQuality,
        createdAt,
        captureScope: capturePayload?.captureScope || "full",
      },
      ...currentCaptures,
    ]);
    setSelectedCaptureId(captureId);
    setPreviewCaptureId(captureId);
    setNewestCaptureId(captureId);

    window.setTimeout(() => {
      setNewestCaptureId((currentCaptureId) =>
        currentCaptureId === captureId ? null : currentCaptureId,
      );
    }, 650);
  }, [
    captureCurrentFrame,
    isRenderTabActive,
    // selectedRenderQuality,
    selectedRoomType,
    t,
  ]);

  const handleCaptureAgain = useCallback(() => {
    setPreviewCaptureId(null);
    setRenderErrorMessage("");
    setRenderSuccessMessage("");
  }, []);

  const executeRenderCapture = useCallback(async ({
    captureToRender,
    roomType,
    inputPrompt,
  }) => {
    if (!captureToRender) return;

    const captureId = captureToRender.id;
    const finalRoomType = String(roomType || "").trim();
    const finalInputPrompt =
      String(inputPrompt || "").trim() ||
      buildEditableRenderPrompt({
        roomType: finalRoomType,
        frameSummary: captureToRender.frameSummary,
        detectedItems: captureToRender.detectedItems,
      });

    if (!finalRoomType) {
      setRenderPromptDialog({
        captureId,
        roomType: "",
        prompt: finalInputPrompt,
        error: t("Choose the room type"),
      });
      return;
    }

    const sourceImage =
      captureToRender.sourceImageDataUrl || captureToRender.imageDataUrl;
    // const renderQuality =
    //   captureToRender.renderQuality || selectedRenderQuality;

    setPreviewCaptureId((currentCaptureId) =>
      currentCaptureId === captureId ? null : currentCaptureId,
    );
    setRenderErrorMessage("");
    setRenderSuccessMessage("");
    updateCaptureById(captureId, {
      status: CAPTURE_STATUS_PROCESSING,
      backendFailed: false,
      errorMessage: "",
      renderRequestedAt: Date.now(),
    });

    try {
      const response = await submitRenderCapture({
        imageDataUrl: sourceImage,
        inputPrompt: finalInputPrompt,
        // quality: renderQuality,
      });

      logCaptureDetection("render-request:response", {
        hasResponse: Boolean(response),
        responseKeys: response ? Object.keys(response) : [],
      });

      const resolvedImageUrl = resolveRenderCaptureImageUrl(
        response?.result?.renderedImageUrl ||
          response?.enhancedImageUrl ||
          response?.generatedImageUrl ||
          response?.renderedImageUrl,
      );
      if (!resolvedImageUrl) {
        throw new Error(t("Render completed, but no image URL was returned."));
      }

      const backendFrameSummary =
        extractBackendFrameSummary(response) || finalInputPrompt;
      const backendDetectedItems = extractBackendDetectedItems(response);

      logCaptureDetection("render-request:parsed-items", {
        backendFrameSummary,
        backendDetectedItems,
        backendDetectedCount: backendDetectedItems.length,
      });

      

      updateCaptureById(captureId, (capture) => ({
        status: CAPTURE_STATUS_READY,
        imageDataUrl: resolvedImageUrl || capture.imageDataUrl,
        sourceImageDataUrl: capture.sourceImageDataUrl || sourceImage,
        thumbnailUrl: capture.thumbnailUrl || resolvedImageUrl,
        completedAt: Date.now(),
        errorMessage: "",
        backendFrameSummary,
        frameSummary: backendFrameSummary || capture.frameSummary,
        roomType: finalRoomType || capture.roomType,
        matchedProducts: response?.matchedProducts || [],
        renderResponse: response,
        detectedItems: backendDetectedItems.length
          ? backendDetectedItems
          : capture.detectedItems,
      }));
      setRenderSuccessMessage(t("Render complete."));
    } catch (error) {
      const captureErrorMessage =
        error?.message || t("Failed to send render request");

      

      updateCaptureById(captureId, {
        status: CAPTURE_STATUS_FAILED,
        completedAt: Date.now(),
        backendFailed: true,
        errorMessage: captureErrorMessage,
      });
      setRenderErrorMessage(captureErrorMessage);
    }
  }, [
    t,
    updateCaptureById,
  ]);

  const handleRender = useCallback(async () => {
    const captureToRender = previewCapture || selectedCapture;
    if (!captureToRender) return;
    if (
      captureToRender.status !== CAPTURE_STATUS_CAPTURED &&
      captureToRender.status !== CAPTURE_STATUS_FAILED
    ) {
      return;
    }

    const roomType = String(captureToRender.roomType || selectedRoomType || "").trim();
    const inputPrompt = buildEditableRenderPrompt({
      roomType,
      frameSummary: captureToRender.frameSummary,
      detectedItems: captureToRender.detectedItems,
    });

    if (!roomType) {
      setRenderPromptDialog({
        captureId: captureToRender.id,
        roomType: "",
        prompt: inputPrompt,
        error: "",
      });
      setRenderErrorMessage("");
      setRenderSuccessMessage("");
      return;
    }

    await executeRenderCapture({
      captureToRender,
      roomType,
      inputPrompt,
    });
  }, [
    executeRenderCapture,
    previewCapture,
    selectedCapture,
    selectedRoomType,
  ]);

  const handleRenderPromptDialogSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      const captureToRender = capturedImages.find(
        (capture) => capture.id === renderPromptDialog?.captureId,
      );
      const roomType = String(renderPromptDialog?.roomType || "").trim();
      const inputPrompt = String(renderPromptDialog?.prompt || "").trim();

      if (!captureToRender) {
        setRenderPromptDialog(null);
        setRenderErrorMessage(t("Capture not found. Please capture again."));
        return;
      }

      if (!roomType) {
        setRenderPromptDialog((currentDialog) => ({
          ...currentDialog,
          error: t("Choose the room type"),
        }));
        return;
      }

      if (!inputPrompt) {
        setRenderPromptDialog((currentDialog) => ({
          ...currentDialog,
          error: t("Please enter a prompt."),
        }));
        return;
      }

      setSelectedRoomType(roomType);
      updateCaptureById(captureToRender.id, {
        roomType,
        frameSummary: inputPrompt,
      });
      setRenderPromptDialog(null);
      await executeRenderCapture({
        captureToRender: {
          ...captureToRender,
          roomType,
          frameSummary: inputPrompt,
        },
        roomType,
        inputPrompt,
      });
    },
    [
      capturedImages,
      executeRenderCapture,
      renderPromptDialog,
      t,
      updateCaptureById,
    ],
  );

  const handleSelectCapture = useCallback(
    (captureId) => {
      setSelectedCaptureId(captureId);

      const clickedCapture = capturedImages.find(
        (capture) => capture.id === captureId,
      );
      if (
        clickedCapture?.status === CAPTURE_STATUS_CAPTURED ||
        clickedCapture?.status === CAPTURE_STATUS_READY ||
        clickedCapture?.status === CAPTURE_STATUS_FAILED
      ) {
        setPreviewCaptureId(captureId);
        setRenderErrorMessage(
          clickedCapture?.status === CAPTURE_STATUS_FAILED
            ? clickedCapture.errorMessage || ""
            : "",
        );
        return;
      }

      setPreviewCaptureId(null);
    },
    [capturedImages],
  );

  const handleUndo = () => {
    if (projectActions) {
      projectActions.undo();
    }
  };

  const handleRedo = () => {
    if (projectActions) {
      projectActions.redo();
    }
  };

  const handleClear = (category) => {
    if (!projectActions) return;
    if (category === "All") {
      projectActions.newProject();
    }
    // Other categories can be extended later
  };

  const persistLatestProject = useCallback(
    async ({ silent = false, title, coverImageUrl, thumbnailUrl } = {}) => {
      const projectJson = latestProjectJsonRef.current;
      const projectHash = latestProjectHashRef.current;
      if (!projectJson || !projectHash) return null;

      if (!isAuthenticatedRef.current) {
        if (!silent) {
          setSaveStatus("error");
          setSaveErrorMessage("Please sign in before saving this project.");
        }
        return null;
      }

      if (silent && !currentProjectIdRef.current) {
        return null;
      }

      if (
        silent &&
        !currentProjectIdRef.current &&
        projectHash === initialProjectHashRef.current
      ) {
        return null;
      }

      const resolvedTitle =
        String(title || currentProjectTitleRef.current || "").trim() ||
        "Planner Project";

      if (
        currentProjectIdRef.current &&
        projectHash === lastSavedProjectHashRef.current &&
        resolvedTitle === lastSavedProjectTitleRef.current
      ) {
        if (!silent) {
          setSaveStatus("saved");
          setSaveErrorMessage("");
        }
        return null;
      }

      if (saveRequestInFlightRef.current) {
        return null;
      }

      saveRequestInFlightRef.current = true;
      if (!silent) {
        setSaveStatus("saving");
        setSaveErrorMessage("");
      }

      try {
        const savedProject = await savePlannerProject({
          projectId: currentProjectIdRef.current,
          projectJson,
          title: resolvedTitle,
          coverImageUrl,
          thumbnailUrl,
        });

        const resolvedProjectId = getProjectDocumentId(savedProject);
        if (resolvedProjectId) {
          currentProjectIdRef.current = resolvedProjectId;
          setCurrentProjectId(resolvedProjectId);
          if (!routeProjectId) {
            navigate(`/planner/${resolvedProjectId}`, { replace: true });
          }
        }

        currentProjectTitleRef.current = resolvedTitle;
        setCurrentProjectTitle(resolvedTitle);
        lastSavedProjectHashRef.current = projectHash;
        lastSavedProjectTitleRef.current = resolvedTitle;
        if (!silent) {
          setSaveStatus("saved");
        }
        return savedProject;
      } catch (error) {
        if (!silent) {
          setSaveStatus("error");
          setSaveErrorMessage(error?.message || "Failed to save project.");
        }
        return null;
      } finally {
        saveRequestInFlightRef.current = false;
      }
    },
    [navigate, routeProjectId],
  );

  useEffect(() => {
    if (!hasResolvedAuth || !isAuthenticated) return undefined;

    const intervalId = window.setInterval(() => {
      persistLatestProject({ silent: true });
    }, AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [hasResolvedAuth, isAuthenticated, persistLatestProject]);

  const saveCurrentProject = async (projectTitle) => {
    if (!projectActions || !plannerState) return;

    try {
      const sceneData = plannerState.get("scene").toJS();
      const projectHash = JSON.stringify(sceneData);
      latestProjectJsonRef.current = sceneData;
      latestProjectHashRef.current = projectHash;

      let coverUrl;
      let thumbnailUrl;

      const latestReadyCapture = capturedImages.find(
        (capture) =>
          capture.status === "ready" &&
          (capture.imageDataUrl || capture.thumbnailUrl),
      );

      if (latestReadyCapture) {
        coverUrl =
          latestReadyCapture.imageDataUrl || latestReadyCapture.thumbnailUrl;
        thumbnailUrl =
          latestReadyCapture.thumbnailUrl || latestReadyCapture.imageDataUrl;
      } else {
        const viewer = window.__viewer3D;
        const captureSource =
          viewer?.captureCanvasImage?.() ||
          viewer?.renderer?.domElement?.toDataURL?.("image/png");

        if (captureSource) {
          coverUrl = captureSource;
          thumbnailUrl = await createThumbnailDataUrl(captureSource);
        }
      }

      await persistLatestProject({
        silent: false,
        title: projectTitle,
        coverImageUrl: coverUrl,
        thumbnailUrl,
      });
    } catch (error) {
      setSaveStatus("error");
      setSaveErrorMessage(error?.message || "Failed to save project.");
    }
  };

  const handleSave = async () => {
    if (!projectActions || !plannerState) return;

    setSaveProjectTitleDraft(currentProjectTitleRef.current.trim());
    setSaveNameError("");
    setSaveNameDialogOpen(true);
  };

  const handleSaveNameSubmit = async (event) => {
    event.preventDefault();
    const projectTitle = saveProjectTitleDraft.trim();

    if (!projectTitle) {
      setSaveNameError("Please enter a project name.");
      return;
    }

    setSaveNameDialogOpen(false);
    setSaveNameError("");
    setCurrentProjectTitle(projectTitle);
    currentProjectTitleRef.current = projectTitle;
    await saveCurrentProject(projectTitle);
  };

  const handleLoad = async () => {
    if (!projectActions) return;

    if (!isAuthenticatedRef.current) {
      setProjectLoadError("Please sign in to load your projects.");
      return;
    }

    setProjectPickerOpen(true);
    setProjectPickerLoading(true);
    setProjectPickerError("");
    setProjectLoadError("");

    try {
      const projects = await getProjects();
      setProjectPickerProjects(projects);
      if (!projects.length) {
        setProjectPickerError("No saved projects found for this account.");
      }
    } catch (error) {
      const message = error?.message || "Failed to fetch your projects.";
      setProjectPickerError(message);
      setProjectLoadError(message);
    } finally {
      setProjectPickerLoading(false);
    }
  };

  const handleLoadProjectFromPicker = async (projectSummary) => {
    const projectId = getProjectDocumentId(projectSummary);
    if (!projectId) {
      setProjectPickerError("This project is missing an ID.");
      return;
    }

    setIsProjectLoading(true);
    setProjectPickerError("");
    setProjectLoadError("");

    try {
      const project = await getProjectById(projectId);
      await loadProjectDocument(project, {
        fallbackProjectId: projectId,
        navigateToProject: true,
      });
      setProjectPickerOpen(false);
    } catch (error) {
      const message = error?.message || "Failed to load project.";
      setProjectPickerError(message);
      setProjectLoadError(message);
    } finally {
      setIsProjectLoading(false);
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z / Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (projectActions) projectActions.undo();
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z = Redo
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "z" || e.key === "Z")
      ) {
        e.preventDefault();
        if (projectActions) projectActions.redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projectActions]);

  // View dropdown toggle renderer — calls viewer3D.handleViewSettingsChange
  const renderViewToggle = useCallback(
    (key, label) => (
      <div
        className="vd-item"
        key={key}
        onClick={() =>
          setViewSettings((s) => {
            const next = { ...s, [key]: !s[key] };
            // Push change to the 3D viewer's applyViewSettings
            if (
              window.__viewer3D &&
              window.__viewer3D.handleViewSettingsChange
            ) {
              window.__viewer3D.handleViewSettingsChange(next);
            }
            return next;
          })
        }
        style={{ cursor: "pointer" }}
      >
        <input
          type="checkbox"
          checked={viewSettings[key]}
          readOnly
          style={{ pointerEvents: "none" }}
        />
        <span>{label}</span>
      </div>
    ),
    [viewSettings],
  );

  return (
    <div className="main-workspace">
      {isProjectLoading && (
        <div className="project-loading-screen" role="status" aria-live="polite">
          <div className="project-loading-panel">
            <div className="project-loading-title">{t("Loading project")}</div>
            <div className="project-loading-bar">
              <span />
            </div>
          </div>
        </div>
      )}

      {projectLoadError && !isProjectLoading && (
        <div className="project-load-error" role="alert">
          {projectLoadError}
        </div>
      )}

      {projectPickerOpen && (
        <div className="project-picker-backdrop" role="presentation">
          <div
            className="project-picker-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-picker-title"
          >
            <div className="project-picker-header">
              <div>
                <h2 id="project-picker-title">{t("Load Project")}</h2>
                <p>{t("Choose one of your saved projects.")}</p>
              </div>
              <button
                className="project-picker-close"
                type="button"
                aria-label={t("Close")}
                onClick={() => setProjectPickerOpen(false)}
              >
                x
              </button>
            </div>

            {projectPickerLoading ? (
              <div className="project-picker-empty">{t("Fetching projects...")}</div>
            ) : projectPickerError ? (
              <div className="project-picker-error" role="alert">
                {projectPickerError}
              </div>
            ) : projectPickerProjects.length ? (
              <div className="project-picker-list">
                {projectPickerProjects.map((project) => {
                  const projectId = getProjectDocumentId(project);
                  const savedDate = formatProjectSavedDate(project);
                  return (
                    <button
                      className={`project-picker-item ${
                        projectId && projectId === currentProjectId
                          ? "active"
                          : ""
                      }`}
                      key={projectId || getProjectDisplayTitle(project)}
                      type="button"
                      onClick={() => handleLoadProjectFromPicker(project)}
                    >
                      <span className="project-picker-thumb">
                        {project.thumbnailUrl || project.coverImageUrl ? (
                          <img
                            src={project.thumbnailUrl || project.coverImageUrl}
                            alt=""
                          />
                        ) : (
                          <span>{getProjectDisplayTitle(project).charAt(0)}</span>
                        )}
                      </span>
                      <span className="project-picker-copy">
                        <strong>{getProjectDisplayTitle(project)}</strong>
                        {savedDate && <small>{savedDate}</small>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="project-picker-empty">
                {t("No saved projects found for this account.")}
              </div>
            )}
          </div>
        </div>
      )}

      {saveNameDialogOpen && (
        <div className="project-picker-backdrop" role="presentation">
          <form
            className="project-name-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-name-title"
            onSubmit={handleSaveNameSubmit}
          >
            <div className="project-picker-header">
              <div>
                <h2 id="project-name-title">
                  {t(currentProjectId ? "Rename Project" : "Name Project")}
                </h2>
                <p>{t("Choose the project name to save.")}</p>
              </div>
              <button
                className="project-picker-close"
                type="button"
                aria-label={t("Close")}
                onClick={() => setSaveNameDialogOpen(false)}
              >
                x
              </button>
            </div>
            <div className="project-name-body">
              <label className="project-name-label" htmlFor="project-name-input">
                {t("Project Name")}
              </label>
              <input
                id="project-name-input"
                className="project-name-input"
                value={saveProjectTitleDraft}
                onChange={(event) => {
                  setSaveProjectTitleDraft(event.target.value);
                  setSaveNameError("");
                }}
                placeholder={t("My interior design project")}
                autoFocus
              />
              {saveNameError && (
                <p className="project-name-error" role="alert">
                  {saveNameError}
                </p>
              )}
            </div>
            <div className="project-dialog-actions">
              <button
                className="project-dialog-btn secondary"
                type="button"
                onClick={() => setSaveNameDialogOpen(false)}
              >
                {t("Cancel")}
              </button>
              <button className="project-dialog-btn primary" type="submit">
                {saveStatus === "saving" ? t("Saving") : t("Save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {renderPromptDialog && (
        <div className="project-picker-backdrop" role="presentation">
          <form
            className="render-prompt-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="render-prompt-title"
            onSubmit={handleRenderPromptDialogSubmit}
          >
            <div className="project-picker-header">
              <div>
                <h2 id="render-prompt-title">{t("Choose the room type")}</h2>
                <p>{t("Select a room type and edit the prompt before sending it to Comfy.")}</p>
              </div>
              <button
                className="project-picker-close"
                type="button"
                aria-label={t("Close")}
                onClick={() => setRenderPromptDialog(null)}
              >
                x
              </button>
            </div>
            <div className="render-prompt-body">
              <div className="render-prompt-room-grid">
                {ROOM_TYPE_OPTIONS.map((option) => {
                  const isSelected = renderPromptDialog.roomType === option.id;
                  return (
                    <button
                      key={option.id}
                      className={`render-prompt-room-option ${isSelected ? "selected" : ""}`}
                      type="button"
                      onClick={() =>
                        setRenderPromptDialog((currentDialog) => ({
                          ...currentDialog,
                          roomType: option.id,
                          error: "",
                          prompt: (() => {
                            const promptWithoutRoom = String(
                              currentDialog.prompt || "",
                            )
                              .replace(/^Room type:\s*[^.]+\.?\s*/i, "")
                              .trim();
                            return promptWithoutRoom
                              ? `Room type: ${humanizeElementName(option.id)}. ${promptWithoutRoom}`
                              : buildEditableRenderPrompt({ roomType: option.id });
                          })(),
                        }))
                      }
                    >
                      {t(option.label)}
                    </button>
                  );
                })}
              </div>

              <label className="project-name-label" htmlFor="render-prompt-input">
                {t("Render Prompt")}
              </label>
              <textarea
                id="render-prompt-input"
                className="render-prompt-input"
                value={renderPromptDialog.prompt}
                onChange={(event) =>
                  setRenderPromptDialog((currentDialog) => ({
                    ...currentDialog,
                    prompt: event.target.value,
                    error: "",
                  }))
                }
              />
              {renderPromptDialog.error && (
                <p className="project-name-error" role="alert">
                  {renderPromptDialog.error}
                </p>
              )}
            </div>
            <div className="project-dialog-actions">
              <button
                className="project-dialog-btn secondary"
                type="button"
                onClick={() => setRenderPromptDialog(null)}
              >
                {t("Cancel")}
              </button>
              <button className="project-dialog-btn primary" type="submit">
                {t("Send to Comfy")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top Navigation */}
      {!isRenderTabActive && (
        <TopNavigationBar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onSave={handleSave}
          onLoad={handleLoad}
          projectActions={projectActions}
          plannerState={plannerState}
          plannerUser={plannerUser}
          isAuthenticated={isAuthenticated}
          saveStatus={saveStatus}
          saveErrorMessage={saveErrorMessage}
          onSignIn={() => navigate("/login")}
          onOpenDashboard={() => navigate("/dashboard")}
        />
      )}

      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Toolbar */}
        {!isRenderTabActive && (
          <LeftToolbar activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        {isRenderTabActive && (
          <RenderTopModeSelector onBack={handleExitRenderView} />
        )}

        {isRenderTabActive && (
          <RenderLeftSidebar
            selectedResolution={selectedRenderQuality}
            onResolutionChange={setSelectedRenderQuality}
            selectedRoomType={selectedRoomType}
            onRoomTypeChange={setSelectedRoomType}
            captureSummaryText={captureSummaryText}
            hasCapturedItems={Boolean(
              selectedCapture?.frameItems?.length ||
                selectedCapture?.detectedItems?.length,
            )}
            hasSelectedCapture={Boolean(selectedCaptureId)}
            isCollapsed={isRenderLeftSidebarCollapsed}
            onCollapsedChange={setIsRenderLeftSidebarCollapsed}
          />
        )}

        {/* Sidebars */}
        <FloorPlanSidebar
          isOpen={activeTab === "floorplan"}
          onClose={handleCloseSidebar}
          linesActions={linesActions}
          holesActions={holesActions}
          projectActions={projectActions}
        />
        <ModelsSidebar
          isOpen={activeTab === "models"}
          onClose={handleCloseSidebar}
          catalog={MyCatalog}
          itemsActions={itemsActions}
          holesActions={holesActions}
          textureActions={textureActions}
          plannerState={plannerState}
          plannerTextures={plannerTextures}
          plannerTextureCategories={plannerTextureCategories}
          plannerTexturesByCategory={plannerTexturesByCategory}
          plannerTexturePaginationByCategory={plannerTexturePaginationByCategory}
          plannerTexturesLoadingByCategory={plannerTexturesLoadingByCategory}
          plannerTextureErrorsByCategory={plannerTextureErrorsByCategory}
          plannerTexturesLoading={plannerTexturesLoading}
          plannerTexturesError={plannerTexturesError}
          cloudModelsByCategory={cloudModelsByCategory}
          cloudModelCategoryTree={cloudModelCategoryTree}
          cloudModelPaginationByCategory={cloudModelPaginationByCategory}
          cloudModelsLoadingByCategory={cloudModelsLoadingByCategory}
          cloudModelErrorsByCategory={cloudModelErrorsByCategory}
          onRequestCloudModels={handleRequestCloudModels}
          onRequestPlannerTextures={handleRequestPlannerTextures}
          onCloudModelSelect={handleCloudModelSelect}
          isAuthenticated={isAuthenticated}
          plannerUserId={plannerUser?.id || ""}
        />
        <GallerySidebar
          isOpen={activeTab === "gallery"}
          onClose={handleCloseSidebar}
        />
        <AdvancedToolsSidebar
          isOpen={activeTab === "advanced"}
          onClose={handleCloseSidebar}
        />

        {/* Main Workspace Canvas */}
        <div
          className="render-canvas-zone"
          style={
            isRenderTabActive
              ? {
                  top: `${RENDER_TOP_BAR_HEIGHT}px`,
                  left: "0",
                  right: "0",
                  bottom: "0",
                }
              : undefined
          }
        >
          <WorkspaceCanvas
            mode={workspaceMode}
            plannerState={plannerState}
            isRenderMode={isRenderTabActive}
            capturePulseActive={isCapturePulseActive}
          />
        </div>

        {isCaptureFlashActive && (
          <div className="render-canvas-shutter active" />
        )}

        <TextureCursorPreview texture={selectedTexturePreview} />

        {isRenderTabActive && previewCapture && (
          <div
            className={`render-selected-preview-overlay ${isRenderLeftSidebarCollapsed ? "left-collapsed" : ""}`}
          >
            <button
              className="render-selected-preview-close"
              type="button"
              aria-label={t("Close preview")}
              onClick={handleCaptureAgain}
            >
              ×
            </button>
            <div className="render-selected-preview">
              <img
                src={
                  previewCapture.imageDataUrl ||
                  previewCapture.sourceImageDataUrl
                }
                alt={t("Selected Capture Preview")}
              />
              <div className="render-selected-preview-meta">
                <span
                  className={`render-selected-preview-status ${previewCapture.status || CAPTURE_STATUS_READY}`}
                >
                  {previewCapture.status === CAPTURE_STATUS_CAPTURED &&
                    t("Captured")}
                  {previewCapture.status === CAPTURE_STATUS_READY &&
                    t("Render ready")}
                  {previewCapture.status === CAPTURE_STATUS_FAILED &&
                    t("Render failed")}
                </span>

                <div className="render-selected-preview-summary-row">
                  {previewSummaryText && (
                    <p className="render-selected-preview-summary">
                      {previewSummaryText}
                    </p>
                  )}

                  {isPreviewCapturePendingRender && (
                    <div className="render-selected-preview-actions">
                      <button
                        className="render-selected-preview-action-btn capture-again"
                        type="button"
                        onClick={handleCaptureAgain}
                      >
                        {t("Capture Again")}
                      </button>
                      <button
                        className="render-selected-preview-action-btn render"
                        type="button"
                        onClick={handleRender}
                      >
                        {t("Render")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isRenderTabActive ? (
          <RenderRightSidebar
            controlType={renderControlType}
            onControlTypeChange={setRenderControlType}
            cameraHeightMm={cameraHeightMm}
            cameraHeightMaxMm={maxCameraHeightMm}
            onCameraHeightChange={handleCameraHeightChange}
            cameraVerticalRotation={cameraVerticalRotation}
            onCameraVerticalRotationChange={handleCameraVerticalRotationChange}
            capturedImages={capturedImages}
            selectedCaptureId={selectedCaptureId}
            onSelectCapture={handleSelectCapture}
            newestCaptureId={newestCaptureId}
          />
        ) : (
          <PropertiesPanel state={plannerState} workspaceMode={workspaceMode} />
        )}

        {/* ─── Bottom Mode Bar: segmented 2D/3D + View ─── */}
        {!isRenderTabActive && (
          <div className="mode-bar">
            <div className="segmented-control">
              <button
                className={`seg-btn ${workspaceMode === "2d" ? "active" : ""}`}
                onClick={() => {
                  projectActions.setMode(MODE_IDLE);
                  setWorkspaceMode("2d");
                }}
              >
                2D
              </button>
              <button
                className={`seg-btn ${workspaceMode === "3d" || workspaceMode === "3d-firstperson" ? "active" : ""}`}
                onClick={() => {
                  viewer3DActions.selectTool3DView();
                  setWorkspaceMode("3d");
                }}
              >
                3D
              </button>
            </div>

            {/* View settings dropdown */}
            <div className="view-menu-wrapper" ref={viewMenuRef}>
              <button
                className={`view-menu-btn ${viewOpen ? "open" : ""}`}
                onClick={() => setViewOpen((v) => !v)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                {t("View")}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                </svg>
              </button>
              {viewOpen && (
                <div className="view-dropdown">
                  <div className="vd-section-title">{t("Camera")}</div>
                  {renderViewToggle("autoHideWalls", t("👁️ Auto-hide Walls"))}
                  <div className="vd-divider" />
                  <div className="vd-section-title">{t("Structure")}</div>
                  {renderViewToggle("walls", t("🧱 Walls"))}
                  {renderViewToggle("doors", t("🚪 Doors"))}
                  {renderViewToggle("windows", t("🪟 Windows"))}
                  <div className="vd-divider" />
                  <div className="vd-section-title">{t("Objects")}</div>
                  {renderViewToggle("furniture", t("🪑 Furniture"))}
                  <div className="vd-divider" />
                  <div className="vd-section-title">
                    {t("Helpers & Guides")}
                  </div>
                  {renderViewToggle("grid", t("📐 Floor Grid"))}
                  {renderViewToggle("helpers", t("➕ Axis Helpers"))}
                  {renderViewToggle("markers", t("📍 Markers"))}
                  {renderViewToggle("guides", t("📏 Guides"))}
                  {renderViewToggle("boundingBoxes", t("⬜ Bounding Boxes"))}
                </div>
              )}
            </div>
          </div>
        )}

        {isRenderTabActive && !isPreviewCapturePendingRender && (
          <BottomRenderActionBar
            hasOpenCapture={false}
            onCapture={handleCapture}
            onRender={handleRender}
            processingCaptureCount={processingCaptureCount}
            renderError={renderErrorMessage}
            renderSuccess={renderSuccessMessage}
            isRenderDisabled
          />
        )}

        {/* Bottom-right controls: zoom + snap */}
        {!isRenderTabActive && (
          <BottomRightControls
            plannerState={plannerState}
            projectActions={projectActions}
            sidebarWidth={getSidebarWidth()}
          />
        )}
      </div>
    </div>
  );
};

// Redux connect
const mapStateToProps = (state) => {
  return {
    state: state,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    projectActions: bindActionCreators(actions.projectActions, dispatch),
    linesActions: bindActionCreators(actions.linesActions, dispatch),
    holesActions: bindActionCreators(actions.holesActions, dispatch),
    viewer3DActions: bindActionCreators(actions.viewer3DActions, dispatch),
    sceneActions: bindActionCreators(actions.sceneActions, dispatch),
    verticesActions: bindActionCreators(actions.verticesActions, dispatch),
    itemsActions: bindActionCreators(actions.itemsActions, dispatch),
    areaActions: bindActionCreators(actions.areaActions, dispatch),
    groupsActions: bindActionCreators(actions.groupsActions, dispatch),
    viewer2DActions: bindActionCreators(actions.viewer2DActions, dispatch),
    textureActions: bindActionCreators(actions.textureActions, dispatch),
  };
};

// Connect the wrapper component that includes the translator hook
const ConnectedMainDesignWorkspace = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainDesignWorkspaceWithTranslator);

export default ConnectedMainDesignWorkspace;
