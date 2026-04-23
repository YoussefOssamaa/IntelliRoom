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
import { useNavigate } from "react-router-dom";
import TopNavigationBar from "./components/TopNavigationBar";
import LeftToolbar from "./components/LeftToolbar";
import FloorPlanSidebar from "./components/FloorPlanSidebar";
import ModelsSidebar from "./components/ModelsSidebar";
import GallerySidebar from "./components/GallerySidebar";
import GestureControlsSidebar from "./components/GestureControlsSidebar";
import AdvancedToolsSidebar from "./components/AdvancedToolsSidebar";
import WorkspaceCanvas from "./components/WorkspaceCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import BottomRightControls from "./components/BottomRightControls";
import RenderTopModeSelector from "./components/RenderTopModeSelector";
import RenderLeftSidebar from "./components/RenderLeftSidebar";
import RenderRightSidebar from "./components/RenderRightSidebar";
import BottomRenderActionBar from "./components/BottomRenderActionBar";

import * as actions from "../../../actions/export";
import { Translator, Catalog } from "../../../index";
import { useTranslator } from "../../../translator/TranslatorContext";
import { PlannerProvider } from "../../../context/PlannerContext";
import MyCatalog from "../../../catalog/mycatalog";
import { createPersonalModelDefinition } from "../../../catalog/utils/personal-models";
import {
  MODE_IDLE,
  MODE_3D_VIEW,
  MODE_3D_FIRST_PERSON,
} from "../../../constants";
import {
  getLatestProject,
  getPlannerUserProfile,
  savePlannerProject,
} from "../../../../services/plannerProjectService";
import {
  resolveRenderCaptureImageUrl,
  submitRenderCapture,
} from "../../../../services/renderCaptureService";
import "./index.css";
//import './components/RenderCapturePreview.css';

const RENDER_CAMERA_HEIGHT_MM_MIN = 0;
const RENDER_CAMERA_HEIGHT_MM_MAX = 2800;
const RENDER_VERTICAL_ROTATION_MIN = -80;
const RENDER_VERTICAL_ROTATION_MAX = 80;
const RENDER_TOP_BAR_HEIGHT = 52;
const CAPTURE_STATUS_CAPTURED = "captured";
const CAPTURE_STATUS_PROCESSING = "processing";
const CAPTURE_STATUS_READY = "ready";
const CAPTURE_STATUS_FAILED = "failed";

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
    return [];
  }

  return rawItems
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.label || item.name || item.type || "").trim();
      }
      return "";
    })
    .filter(Boolean);
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
    gestureZoom: false,
    gestureCameraPreview: false,
  });
  const fileInputRef = useRef(null);
  const viewMenuRef = useRef(null);
  const personalModelUrlsRef = useRef([]);
  const [plannerUser, setPlannerUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
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
  const [personalModels, setPersonalModels] = useState([]);
  const renderViewerSyncRef = useRef({
    viewer: null,
    isRenderTabActive: null,
    renderSubMode: null,
    renderControlType: null,
    cameraHeightMm: null,
    maxCameraHeightMm: null,
    cameraVerticalRotation: null,
  });

  const plannerState = state ? state.get("react-planner") : null;
  const isRenderTabActive = activeTab === "render";
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
      const user = await getPlannerUserProfile();
      if (cancelled) return;

      if (user) {
        setPlannerUser(user);
        setIsAuthenticated(true);
      } else {
        setPlannerUser(null);
        setIsAuthenticated(false);
      }
    };

    loadAuthProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      personalModelUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {
          // Ignore cleanup errors for already revoked URLs.
        }
      });
      personalModelUrlsRef.current = [];
    },
    [],
  );

  const handlePersonalModelUpload = useCallback(
    async (file) => {
      const fileName = String(file?.name || "");
      if (!file || !/\.glb$/i.test(fileName)) {
        throw new Error("Please upload a valid .glb file.");
      }

      const modelUrl = URL.createObjectURL(file);

      try {
        const personalModel = await createPersonalModelDefinition(
          file,
          modelUrl,
        );

        if (!MyCatalog.hasElement(personalModel.type)) {
          MyCatalog.registerElement(personalModel.element);
          projectActions?.initCatalog?.(MyCatalog);
        }

        personalModelUrlsRef.current.push(modelUrl);
        setPersonalModels((currentModels) => [personalModel, ...currentModels]);
        return personalModel;
      } catch (error) {
        URL.revokeObjectURL(modelUrl);
        throw error;
      }
    },
    [projectActions],
  );

  // ──── Sync local workspaceMode with Redux mode (very important) ────
  const reduxMode = plannerState ? plannerState.get("mode") : null;
  useEffect(() => {
    if (!reduxMode) return;
    if (
      reduxMode === MODE_3D_VIEW ||
      reduxMode === "MODE_DRAWING_ITEM_3D" ||
      reduxMode === "MODE_DRAGGING_ITEM_3D" ||
      reduxMode === "MODE_DRAWING_HOLE_3D" ||
      reduxMode === "MODE_DRAGGING_HOLE_3D" ||
      reduxMode === "MODE_APPLYING_TEXTURE" ||
      reduxMode === "MODE_3D_MEASURE"
    ) {
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
    switch (activeTab) {
      case "floorplan":
        return 288;
      case "models":
        return 600;
      case "gallery":
        return 384;
      case "gestures":
        return 340;
      case "advanced":
        return 320;
      case "render":
        return 568;
      default:
        return 0;
    }
  };

  const applyViewSettings = useCallback((updater) => {
    setViewSettings((currentSettings) => {
      const nextSettings =
        typeof updater === "function" ? updater(currentSettings) : updater;

      window.__plannerViewSettings = nextSettings;
      window.dispatchEvent(
        new CustomEvent("planner:view-settings-change", {
          detail: nextSettings,
        }),
      );

      if (window.__viewer3D?.handleViewSettingsChange) {
        window.__viewer3D.handleViewSettingsChange(nextSettings);
      }

      return nextSettings;
    });
  }, []);

  const handleToggleViewSetting = useCallback(
    (key) => {
      applyViewSettings((currentSettings) => ({
        ...currentSettings,
        [key]: !currentSettings[key],
      }));
    },
    [applyViewSettings],
  );

  useEffect(() => {
    if (!isRenderTabActive) return;

    if (window.__RENDER_DEBUG__) {
      console.debug(
        "[RenderWorkspace] entering render mode, selecting first-person tool",
      );
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

        if (becameActive || syncState.cameraHeightMm !== cameraHeightMm) {
          viewer.setRenderCameraHeight?.(
            convertMmToViewerUnits(cameraHeightMm),
          );
        }

        if (
          becameActive ||
          Math.abs(
            (syncState.cameraVerticalRotation ?? 0) - cameraVerticalRotation,
          ) > 0.0001
        ) {
          viewer.setRenderCameraVerticalRotation?.(cameraVerticalRotation);
        }

        syncState.isRenderTabActive = true;
        syncState.renderSubMode = renderSubMode;
        syncState.renderControlType = renderControlType;
        syncState.maxCameraHeightMm = maxCameraHeightMm;
        syncState.cameraHeightMm = cameraHeightMm;
        syncState.cameraVerticalRotation = cameraVerticalRotation;

        if (window.__RENDER_DEBUG__) {
          console.debug("[RenderWorkspace] apply viewer state", {
            renderSubMode,
            renderControlType,
            cameraHeightMm,
            maxCameraHeightMm,
            cameraVerticalRotation,
          });
        }
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
    setCameraHeightMm(
      clampNumber(value, RENDER_CAMERA_HEIGHT_MM_MIN, maxCameraHeightMm),
    );
  };

  const handleCameraVerticalRotationChange = (value) => {
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

    const readValue = (source, key) => {
      if (!source) return undefined;
      if (typeof source.get === "function") {
        return source.get(key);
      }
      return source[key];
    };

    const getItemName = (item) => {
      const directName =
        readValue(item, "name") ||
        readValue(item, "label") ||
        readValue(item, "title");

      if (directName) {
        return String(directName).trim();
      }

      const rawType = readValue(item, "type") || readValue(item, "prototype");
      if (!rawType) {
        return "";
      }

      const normalizedType = String(rawType).split("/").pop();
      return String(normalizedType || rawType).trim();
    };

    const collectItemNames = (itemsCollection, shouldInclude) => {
      if (!itemsCollection) {
        return [];
      }

      const names = [];

      if (typeof itemsCollection.forEach === "function") {
        itemsCollection.forEach((item, itemId) => {
          if (typeof shouldInclude === "function" && !shouldInclude(item, itemId)) {
            return;
          }

          const itemName = getItemName(item);
          if (itemName) {
            names.push(itemName);
          }
        });

        return names;
      }

      if (Array.isArray(itemsCollection)) {
        itemsCollection.forEach((item, itemIndex) => {
          if (typeof shouldInclude === "function" && !shouldInclude(item, itemIndex)) {
            return;
          }

          const itemName = getItemName(item);
          if (itemName) {
            names.push(itemName);
          }
        });

        return names;
      }

      if (typeof itemsCollection === "object") {
        Object.entries(itemsCollection).forEach(([itemId, item]) => {
          if (typeof shouldInclude === "function" && !shouldInclude(item, itemId)) {
            return;
          }

          const itemName = getItemName(item);
          if (itemName) {
            names.push(itemName);
          }
        });
      }

      return names;
    };

    const getPlannerStateItemNames = () => {
      const scene = plannerState?.get?.("scene");
      if (!scene?.get) {
        return [];
      }

      const selectedLayerId = scene.get("selectedLayer");
      const selectedLayer = selectedLayerId
        ? scene.getIn(["layers", selectedLayerId])
        : null;

      if (selectedLayer) {
        return normalizeItemNames(collectItemNames(readValue(selectedLayer, "items")));
      }

      const layers = scene.get("layers");
      if (!layers || typeof layers.forEach !== "function") {
        return [];
      }

      const allNames = [];
      layers.forEach((layer) => {
        allNames.push(...collectItemNames(readValue(layer, "items")));
      });

      return normalizeItemNames(allNames);
    };

    const getSceneGraphVisibleItemNames = (viewer) => {
      const scene = plannerState?.get?.("scene");
      const selectedLayerId = scene?.get?.("selectedLayer");
      if (!selectedLayerId) {
        return [];
      }

      const selectedLayer = scene.getIn?.(["layers", selectedLayerId]);
      const selectedLayerItems = readValue(selectedLayer, "items");
      const sceneLayerItems = viewer?.planData?.sceneGraph?.layers?.[selectedLayerId]?.items;

      if (!selectedLayerItems || !sceneLayerItems) {
        return [];
      }

      return normalizeItemNames(
        collectItemNames(selectedLayerItems, (_, itemId) => {
          const mesh = sceneLayerItems?.[itemId];
          return mesh?.visible !== false;
        }),
      );
    };

    const getVisibleItemNames = (viewer) => {
      if (!viewer) {
        return getPlannerStateItemNames();
      }

      if (typeof viewer.getVisibleFrameItemNames === "function") {
        return normalizeItemNames(viewer.getVisibleFrameItemNames());
      }

      if (typeof viewer.getVisibleItemNames === "function") {
        return normalizeItemNames(viewer.getVisibleItemNames());
      }

      const sceneGraphVisibleNames = getSceneGraphVisibleItemNames(viewer);
      if (sceneGraphVisibleNames.length > 0) {
        return sceneGraphVisibleNames;
      }

      return getPlannerStateItemNames();
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

      try {
        const visibleItemNames = getVisibleItemNames(viewer);
       // const selectedItemNames = normalizeItemNames(viewer.getSelectedFrameItemNames());
        const imageDataUrl = renderer?.domElement?.toDataURL?.("image/png");
        capturePayload = {
          imageDataUrl,
          //selectedItemNames,
          visibleItemNames,
          captureScope: visibleItemNames.length ? "visible" : "full",
        };
      } catch (captureError) {
        console.error(
          "[RenderWorkspace] Failed to read current frame from renderer",
          {
            error: captureError,
            hasViewer: Boolean(viewer),
            hasRenderer: Boolean(renderer),
            attempt,
          },
        );
      }

      if (!capturePayload.imageDataUrl) {
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

    setCapturedImages((currentCaptures) => [
      {
        id: captureId,
        status: CAPTURE_STATUS_CAPTURED,
        imageDataUrl: captureSource,
        // sourceImageDataUrl: captureSource,
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

  const handleRender = useCallback(async () => {
    const captureToRender = previewCapture || selectedCapture;
    if (!captureToRender) return;
    if (
      captureToRender.status !== CAPTURE_STATUS_CAPTURED &&
      captureToRender.status !== CAPTURE_STATUS_FAILED
    ) {
      return;
    }

    const captureId = captureToRender.id;
    const detectedItemSummary = Array.isArray(captureToRender.detectedItems)
      ? captureToRender.detectedItems
          .map((item) => {
            if (!item) return "";
            if (typeof item === "string") return item;
            return item.label || item.name || "";
          })
          .filter(Boolean)
          .join(", ")
      : "";
    const inputPrompt =
      captureToRender.frameSummary ||
      buildCaptureFrameSummary({
        roomType: captureToRender.roomType,
        frameSummary: detectedItemSummary,
      });
    const sourceImage = captureToRender.imageDataUrl;
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
        inputPrompt,
        // quality: renderQuality,
      });

      const resolvedImageUrl = resolveRenderCaptureImageUrl(
        response?.result?.renderedImageUrl ||
          response?.renderedImageUrl ||
          sourceImage,
      );
      const backendFrameSummary =
        extractBackendFrameSummary(response) || inputPrompt;
      const backendDetectedItems = extractBackendDetectedItems(response);

      if (window.__RENDER_DEBUG__) {
        console.debug("[RenderWorkspace] Capture render resolved", {
          captureId,
          hasResponse: Boolean(response),
          resolvedImageUrl,
          backendFrameSummary,
        });
      }

      updateCaptureById(captureId, (capture) => ({
        status: CAPTURE_STATUS_READY,
        imageDataUrl: resolvedImageUrl || capture.imageDataUrl,
        thumbnailUrl: capture.thumbnailUrl || resolvedImageUrl,
        completedAt: Date.now(),
        errorMessage: "",
        backendFrameSummary,
        frameSummary: backendFrameSummary || capture.frameSummary,
        detectedItems: backendDetectedItems.length
          ? backendDetectedItems
          : capture.detectedItems,
      }));
      setRenderSuccessMessage(t("Render complete."));
    } catch (error) {
      const captureErrorMessage =
        error?.message || t("Failed to send render request");

      console.warn(
        "[RenderWorkspace] Backend render failed, keeping local capture",
        {
          captureId,
          message: captureErrorMessage,
          error,
        },
      );

      updateCaptureById(captureId, {
        status: CAPTURE_STATUS_FAILED,
        completedAt: Date.now(),
        backendFailed: true,
        errorMessage: captureErrorMessage,
      });
      setRenderErrorMessage(captureErrorMessage);
    }
  }, [
    previewCapture,
    selectedCapture,
    // selectedRenderQuality,
    t,
    updateCaptureById,
  ]);

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

  const handleSave = async () => {
    if (!projectActions || !plannerState) return;

    // If user isn't authenticated yet, keep existing local-file save behavior.
    if (!isAuthenticated) {
      projectActions.saveProject();
      return;
    }

    try {
      const sceneData = plannerState.get("scene").toJS();
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

      const savedProject = await savePlannerProject({
        projectId: currentProjectId,
        sceneData,
        title: "Planner Project",
        coverUrl,
        thumbnailUrl,
      });

      const resolvedProjectId =
        savedProject?.projectId || savedProject?._id || null;
      if (resolvedProjectId) {
        setCurrentProjectId(resolvedProjectId);
      }
    } catch (error) {
      console.error("Error saving project to backend:", error);
      // Fallback to local-file save to avoid blocking user work
      projectActions.saveProject();
    }
  };

  const handleLoad = async () => {
    if (!projectActions) return;

    // If user isn't authenticated yet, keep existing local-file load behavior.
    if (!isAuthenticated) {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    try {
      const latestProject = await getLatestProject();

      if (!latestProject || !latestProject.data) {
        // No cloud projects yet: fallback to local file picker
        if (fileInputRef.current) fileInputRef.current.click();
        return;
      }

      projectActions.loadProject(latestProject.data);
      const resolvedProjectId =
        latestProject.projectId || latestProject._id || null;
      if (resolvedProjectId) {
        setCurrentProjectId(resolvedProjectId);
      }
    } catch (error) {
      console.error("Error loading project from backend:", error);
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  const handleFileLoad = (event) => {
    const file = event.target.files[0];
    if (file && projectActions) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sceneJSON = JSON.parse(e.target.result);
          projectActions.loadProject(sceneJSON);
        } catch (error) {
          console.error("Error loading project:", error);
        }
      };
      reader.readAsText(file);
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
        onClick={() => handleToggleViewSetting(key)}
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
    [handleToggleViewSetting, viewSettings],
  );

  return (
    <div className="main-workspace">
      {/* Hidden file input for loading projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileLoad}
      />

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
        />
        <ModelsSidebar
          isOpen={activeTab === "models"}
          onClose={handleCloseSidebar}
          catalog={MyCatalog}
          itemsActions={itemsActions}
          holesActions={holesActions}
          textureActions={textureActions}
          plannerState={plannerState}
          personalModels={personalModels}
          onPersonalModelUpload={handlePersonalModelUpload}
        />
        <GallerySidebar
          isOpen={activeTab === "gallery"}
          onClose={handleCloseSidebar}
        />
        <GestureControlsSidebar
          isOpen={activeTab === "gestures"}
          onClose={handleCloseSidebar}
          workspaceMode={workspaceMode}
          viewSettings={viewSettings}
          onToggleSetting={handleToggleViewSetting}
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
                  <div className="vd-divider" />
                  <div className="vd-section-title">{t("Hand Gestures")}</div>
                  {renderViewToggle(
                    "gestureZoom",
                    t("👋 Enable Gesture Control"),
                  )}
                  {renderViewToggle(
                    "gestureCameraPreview",
                    t("📷 Show Camera Preview"),
                  )}
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
