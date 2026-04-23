"use strict";

import React from "react";
import { useEffect } from "react";
import PropTypes from "prop-types";
import * as Three from "three";
import { Map, fromJS } from "immutable";
import { OrbitControls } from "three-stdlib";
import { parseData, updateScene } from "./scene-creator";
import { disposeScene } from "./three-memory-cleaner";
import diff from "immutablediff";
import * as SharedStyle from "../../shared-style";
import { disposeGhostMesh, createPlacementIndicator } from "./ghost-renderer";
import {
  MODE_DRAWING_ITEM_3D,
  MODE_DRAGGING_ITEM_3D,
  MODE_DRAWING_HOLE_3D,
  MODE_DRAGGING_HOLE_3D,
  MODE_IDLE,
  MODE_3D_VIEW,
  MODE_APPLYING_TEXTURE,
  MODE_3D_MEASURE,
} from "../../constants";
import {
  applySnapping,
  updateSnapIndicatorColor,
  DEFAULT_SNAP_CONFIG,
  SNAP_3D_WALL,
  SNAP_3D_GRID,
  SNAP_3D_ITEM,
  SnapState,
  computeItemFootprint,
} from "../../utils/snap-3d";
import { wallVisibilityManager } from "./wall-visibility-manager";
import ViewSettingsPanel, { DEFAULT_SETTINGS } from "./view-settings-panel";
import SelectionGizmoManager from "./selection-gizmo-manager";
import HoleMeasurementGuides from "./hole-measurement-guides";
import MeasureTool from "./measure-tool";
import HandGestureController from "./hand-gesture-controller";
import PlannerContext from "../../context/PlannerContext";

export default class Scene3DViewer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      gestureUi: {
        enabled: false,
        ready: false,
        error: null,
        debug: "",
      },
    };

    this.canvasWrapperRef = React.createRef();
    this.gesturePreviewRef = React.createRef();
    this.lastMousePosition = {};
    this.width = props.width;
    this.height = props.height;
    this.renderingID = 0;

    this.renderer =
      window.__threeRenderer ||
      new Three.WebGLRenderer({
        preserveDrawingBuffer: true,
        antialias: true,
      });
    window.__threeRenderer = this.renderer;

    // 3D placement state
    this.previewMesh = null; // For new item placement - the actual mesh
    this.previewItemFootprint = null;
    this.placementIndicator = null;
    this.currentRotation = 0;
    this.raycaster = new Three.Raycaster();
    this.mouseDownTime = 0;
    this.mouseDownPosition = { x: 0, y: 0 };
    this._lastMouseUpStamp = -1; // Dedup guard for duplicate capture-phase listeners

    // 3D dragging state - uses actual item mesh, no ghost
    this.isDragging3D = false;
    this.draggedItemID = null;
    this.draggedItemLayerID = null;
    this.draggedItemMesh = null; // The actual mesh being dragged
    this.dragStartPosition = null; // Original position for cancel
    this.draggedItemFootprint = null; // Local-space { halfWidth, halfDepth }
    this.targetRotation = null; // Auto-rotation target (wall snap)

    // 3D hole placement state
    this.holePreviewMesh = null;
    this.holePreviewBoundingBox = null; // Visual bounding box for preview
    this.holePreviewBoxOffset = new Three.Vector3(); // Offset from mesh to box center
    this.holePreviewHalfWidth = 0;
    this.holePlacementLine = null; // The line (wall) the hole snaps to
    this.holePlacementOffset = 0;
    this.holeAltitudeAdjustment = 0; // Manual altitude adjustment for windows
    this.holeDefaultAltitude = 0; // Default altitude from catalog
    this.holeWallThickness = 0; // Thickness of the wall for centering

    // 3D hole dragging state
    this.isDraggingHole3D = false;
    this.draggedHoleID = null;
    this.draggedHoleLayerID = null;

    // Cursor tracking for immediate preview placement
    this.currentCursor3D = { x: 0, z: 0, valid: false };

    // Snapping configuration
    this.snapConfig = {
      ...DEFAULT_SNAP_CONFIG,
      enabled: true,
      wallSnapDistance: 50,
      wallSnapReleaseDistance: 80,
      wallOffset: 5,
      gridSnapSize: 20,
      gridSnapMinDistance: 3,
      itemSnapDistance: 30,
      itemSnapReleaseDistance: 50,
    };
    this.currentSnapType = null;
    // Snap state tracker (hysteresis) — one instance reused across drags
    this.snapState = new SnapState();

    // View settings state
    this.viewSettings = { ...DEFAULT_SETTINGS };

    // Selection / hover gizmo manager (instantiated in componentDidMount)
    this.gizmoManager = null;

    // Measurement guides shown when a hole (door/window) is selected
    this.holeMeasurementGuides = null;

    // Track whether camera has been positioned from real geometry.
    // Initial parseData often runs with empty scene; we re-centre once on first 3D entry.
    this._cameraInitializedWithContent = false;

    // When a NEW_PROJECT / LOAD_PROJECT happens, Viewer3D stays mounted (hidden in 2D),
    // so OrbitControls/camera state persists. We mark a one-time pending recenter
    // and apply it after the new project's bounding box is recomputed.
    this._pendingRecenterAfterProjectChange = false;

    // Bind view settings handler
    this.handleViewSettingsChange = this.handleViewSettingsChange.bind(this);
    this.applyGestureInput = this.applyGestureInput.bind(this);
    this.syncGesturePreview = this.syncGesturePreview.bind(this);
    this.handleExternalViewSettingsChange =
      this.handleExternalViewSettingsChange.bind(this);
    this.updateGestureDebug = this.updateGestureDebug.bind(this);

    // Render-loop optimization caches (no quality/feature changes)
    this._lodEntries = [];
    this._lodDirty = true;
    this._sceneDirtyForFrame = true;
    this._hasLastFrameCameraState = false;
    this._lastCameraPosition = new Three.Vector3();
    this._lastCameraQuaternion = new Three.Quaternion();
    this._lastOrbitTarget = new Three.Vector3();
    this._tmpSpotlightDirection = new Three.Vector3();
    this._lastRendererWidth = this.width;
    this._lastRendererHeight = this.height;
    this._viewerActive = false;
    this.gestureSessionState = null;
    this._lastGestureDebugUpdate = 0;

    this._renderFrame = this._renderFrame.bind(this);
    this._markSceneDirty = this._markSceneDirty.bind(this);
  }

  isGestureControlMode(mode = this.props.state.get("mode")) {
    return [
      MODE_3D_VIEW,
      MODE_DRAWING_ITEM_3D,
      MODE_DRAGGING_ITEM_3D,
      MODE_DRAWING_HOLE_3D,
      MODE_DRAGGING_HOLE_3D,
      MODE_APPLYING_TEXTURE,
      MODE_3D_MEASURE,
    ].includes(mode);
  }

  async setGestureZoomEnabled(enabled) {
    if (!this.handGestureController) {
      this.handGestureController = new HandGestureController({
        onStatusChange: (gestureUi) =>
          this.setState(
            (previousState) => ({
              gestureUi: {
                ...gestureUi,
                debug: previousState.gestureUi.debug,
              },
            }),
            this.syncGesturePreview,
          ),
      });
    }

    if (!enabled) {
      this.handGestureController.stop();
      this.gestureSessionState = null;
      this.syncGesturePreview();
      this._markSceneDirty();
      return;
    }

    try {
      await this.handGestureController.start();
      this.syncGesturePreview();
      this._markSceneDirty();
    } catch (error) {
      this.setState(
        {
          gestureUi: {
            enabled: false,
            ready: false,
            error: error.message || "Failed to start hand gestures.",
            debug: "",
          },
        },
        this.syncGesturePreview,
      );
    }
  }

  syncGesturePreview() {
    const previewRoot = this.gesturePreviewRef.current;
    if (!previewRoot) return;

    previewRoot.replaceChildren();

    if (!this.viewSettings?.gestureCameraPreview) return;
    if (!this.handGestureController) return;

    const video = this.handGestureController.getVideoElement();
    if (!video) return;

    Object.assign(video.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: "scaleX(-1)",
      borderRadius: "14px",
      display: "block",
    });

    previewRoot.appendChild(video);
  }

  handleExternalViewSettingsChange(event) {
    const nextSettings = event?.detail;
    if (!nextSettings || typeof nextSettings !== "object") return;

    this.handleViewSettingsChange({
      ...DEFAULT_SETTINGS,
      ...nextSettings,
    });
  }

  updateGestureDebug(gestureFrame, details = null) {
    const now = performance.now();
    if (now - this._lastGestureDebugUpdate < 120) return;
    this._lastGestureDebugUpdate = now;

    const debug = gestureFrame?.detected
      ? `mode=${gestureFrame.twoHandZoomActive ? "zoom-2h" : gestureFrame.rotationActive ? "rotate-1h" : gestureFrame.pinchActive ? "hold-1h" : "idle"} hands=${gestureFrame.handsDetected || 0} track=${gestureFrame.trackingHeld ? "held" : "live"} hold=${Math.round(
          gestureFrame.holdMs || 0,
        )}ms pinchDist=${Number(gestureFrame.pinchDistance || 0).toFixed(3)} zoomDist=${Number(gestureFrame.zoomDistance || 0).toFixed(3)} session=${gestureFrame.sessionId || 0}${details ? ` ${details}` : ""}`
      : "no hand detected";

    this.setState((previousState) => ({
      gestureUi: {
        ...previousState.gestureUi,
        debug,
      },
    }));
  }

  applyGestureInput() {
    if (!this.viewSettings?.gestureZoom || !this.handGestureController) return;
    if (!this.handGestureController.ready || !this.handGestureController.enabled)
      return;
    if (!this.isGestureControlMode()) return;
    if (!this.orbitControls || !this.camera) return;

    const gestureFrame = this.handGestureController.update();
    if (!gestureFrame?.detected) {
      this.gestureSessionState = null;
      this.updateGestureDebug(gestureFrame);
      return;
    }

    if (!gestureFrame.pinchActive && !gestureFrame.twoHandZoomActive) {
      this.gestureSessionState = null;
      this.updateGestureDebug(gestureFrame);
      return;
    }

    const currentOffset = new Three.Vector3().subVectors(
      this.camera.position,
      this.orbitControls.target,
    );
    const currentSpherical = new Three.Spherical().setFromVector3(
      currentOffset,
    );
    const currentDistance = Math.max(currentOffset.length(), 0.001);

    let nextDistance = currentDistance;
    let nextTheta = currentSpherical.theta;
    let nextPhi = currentSpherical.phi;
    let debugDetails = null;

    if (gestureFrame.twoHandZoomActive) {
      if (
        !this.gestureSessionState ||
        this.gestureSessionState.sessionId !== gestureFrame.sessionId ||
        this.gestureSessionState.mode !== "two-hand-zoom"
      ) {
        this.gestureSessionState = {
          sessionId: gestureFrame.sessionId,
          mode: "two-hand-zoom",
          baseDistance: currentDistance,
          baseZoomDistance: Math.max(gestureFrame.zoomDistance || 0.001, 0.001),
        };
      }

      const gestureState = this.gestureSessionState;
      const zoomSpreadRatio =
        Math.max(gestureFrame.zoomDistance || 0.001, 0.001) /
        Math.max(gestureState.baseZoomDistance, 0.001);
      const zoomFactor = Math.pow(
        Three.MathUtils.clamp(zoomSpreadRatio, 0.35, 2.8),
        1.85,
      );
      const targetDistance = Three.MathUtils.clamp(
        gestureState.baseDistance / zoomFactor,
        80,
        12000,
      );
      nextDistance = Three.MathUtils.lerp(
        currentDistance,
        targetDistance,
        0.14,
      );
      debugDetails = `spread=${zoomSpreadRatio.toFixed(3)} zoom=${zoomFactor.toFixed(3)}`;
    } else {
      if (
        !this.gestureSessionState ||
        this.gestureSessionState.sessionId !== gestureFrame.sessionId ||
        this.gestureSessionState.mode !== "single-hand-rotate"
      ) {
        this.gestureSessionState = {
          sessionId: gestureFrame.sessionId,
          mode: "single-hand-rotate",
          baseTheta: currentSpherical.theta,
          basePhi: currentSpherical.phi,
          baseCenter: gestureFrame.handCenter
            ? { ...gestureFrame.handCenter }
            : { x: 0.5, y: 0.5 },
        };
      }

      const gestureState = this.gestureSessionState;

      if (gestureFrame.rotationActive && gestureFrame.handCenter) {
        const deltaX = gestureFrame.handCenter.x - gestureState.baseCenter.x;
        const deltaY = gestureFrame.handCenter.y - gestureState.baseCenter.y;
        const targetTheta = gestureState.baseTheta + deltaX * 20;
        const targetPhi = Three.MathUtils.clamp(
          gestureState.basePhi - deltaY * 14,
          0.25,
          Math.PI - 0.25,
        );

        nextTheta = Three.MathUtils.lerp(
          currentSpherical.theta,
          targetTheta,
          0.12,
        );
        nextPhi = Three.MathUtils.lerp(
          currentSpherical.phi,
          targetPhi,
          0.12,
        );
        debugDetails = `dx=${deltaX.toFixed(3)} dy=${deltaY.toFixed(3)}`;
      }
    }

    this.updateGestureDebug(gestureFrame, debugDetails);

    const nextOffset = new Three.Vector3().setFromSpherical(
      new Three.Spherical(nextDistance, nextPhi, nextTheta),
    );

    this.camera.position.copy(this.orbitControls.target).add(nextOffset);
    this.camera.lookAt(this.orbitControls.target);
    this.orbitControls.update();
    this._sceneDirtyForFrame = true;
  }

  _refreshLodEntries(planData) {
    const lodMap =
      (planData && planData.sceneGraph && planData.sceneGraph.LODs) || {};
    this._lodEntries = Object.values(lodMap).filter(Boolean);
    this._lodDirty = false;
  }

  _didCameraStateChange(camera, orbitController) {
    if (!this._hasLastFrameCameraState) {
      this._lastCameraPosition.copy(camera.position);
      this._lastCameraQuaternion.copy(camera.quaternion);
      this._lastOrbitTarget.copy(orbitController.target);
      this._hasLastFrameCameraState = true;
      return true;
    }

    const positionChanged =
      this._lastCameraPosition.distanceToSquared(camera.position) > 1e-8;
    const targetChanged =
      this._lastOrbitTarget.distanceToSquared(orbitController.target) > 1e-8;
    const rotationChanged =
      1 - Math.abs(this._lastCameraQuaternion.dot(camera.quaternion)) > 1e-8;

    if (positionChanged || targetChanged || rotationChanged) {
      this._lastCameraPosition.copy(camera.position);
      this._lastCameraQuaternion.copy(camera.quaternion);
      this._lastOrbitTarget.copy(orbitController.target);
      return true;
    }

    return false;
  }

  _recenterCameraToPlanBounds(planData) {
    const pd = planData || this.planData;
    if (!pd || !pd.boundingBoxCenter || !pd.boundingBox) return;
    if (!this.orbitControls || !this.camera) return;

    const cx = pd.boundingBoxCenter.x;
    const cy = pd.boundingBoxCenter.y;
    const cz = pd.boundingBoxCenter.z;
    const camX = cx - (pd.boundingBoxCenter.lenX || 500);
    const camZ = cz + (pd.boundingBoxCenter.lenZ || 500);

    this.orbitControls.target.set(cx, cy, cz);
    this.camera.position.set(camX, 500, camZ);
    this.camera.up.set(0, 1, 0);

    if (this.directionalLight) {
      this.directionalLight.position.set(camX + 50, 500, camZ + 50);
    }

    // Sync OrbitControls internal spherical state
    if (typeof this.orbitControls.update === "function") {
      this.orbitControls.update();
    }
  }

  _markSceneDirty() {
    this._sceneDirtyForFrame = true;
    this._ensureRenderLoop();
  }

  _ensureRenderLoop() {
    if (
      this.renderingID ||
      !this._viewerActive ||
      !this.scene3D ||
      !this.camera ||
      !this.orbitControls
    ) {
      return;
    }

    this.renderingID = requestAnimationFrame(this._renderFrame);
  }

  _stopRenderLoop() {
    if (this.renderingID) {
      cancelAnimationFrame(this.renderingID);
      this.renderingID = 0;
    }
  }

  _setViewerActive(isActive) {
    const nextActive = isActive !== false;
    if (this._viewerActive === nextActive) return;

    this._viewerActive = nextActive;
    if (nextActive) {
      this._markSceneDirty();
    } else {
      this._stopRenderLoop();
    }
  }

  _renderFrame() {
    this.renderingID = 0;

    if (
      !this._viewerActive ||
      !this.scene3D ||
      !this.camera ||
      !this.orbitControls
    ) {
      return;
    }

    this.applyGestureInput();

    const orbitUpdated =
      typeof this.orbitControls.update === "function"
        ? this.orbitControls.update() === true
        : false;
    const cameraChanged =
      orbitUpdated ||
      this._didCameraStateChange(this.camera, this.orbitControls);

    if (this.holeMeasurementGuides && this.holeMeasurementGuides.root) {
      this.holeMeasurementGuides.root.visible = !this._isOrbiting;
    }

    if (cameraChanged && this.cameraSpotlight) {
      this._tmpSpotlightDirection
        .subVectors(this.orbitControls.target, this.camera.position)
        .normalize();
      this.cameraSpotlight.target.position
        .copy(this.camera.position)
        .add(this._tmpSpotlightDirection.multiplyScalar(100));
      this.camera.updateMatrix();
      this.camera.updateMatrixWorld();
    }

    const wallChanged = !!wallVisibilityManager.update(
      cameraChanged,
      this._sceneDirtyForFrame,
    );
    const gizmoChanged = this.gizmoManager
      ? !!this.gizmoManager.update(cameraChanged, this._sceneDirtyForFrame)
      : false;

    if (this._lodDirty) {
      this._refreshLodEntries(this.planData);
      this._sceneDirtyForFrame = true;
    }

    let shouldRender =
      cameraChanged || wallChanged || gizmoChanged || this._sceneDirtyForFrame;

    if (cameraChanged || this._sceneDirtyForFrame) {
      for (let index = 0; index < this._lodEntries.length; index++) {
        this._lodEntries[index].update(this.camera);
      }
      shouldRender = true;
    }

    if (shouldRender) {
      this.renderer.render(this.scene3D, this.camera);
      this._sceneDirtyForFrame = false;
    }

    if (
      this._viewerActive &&
      (this._sceneDirtyForFrame ||
        wallVisibilityManager.hasActiveTransitions() ||
        (this.gizmoManager && this.gizmoManager.hasActiveAnimations()) ||
        (this.viewSettings?.gestureZoom &&
          this.handGestureController?.enabled &&
          this.handGestureController?.ready))
    ) {
      this._ensureRenderLoop();
    }
  }

  _getRaycastElementData(object) {
    let current = object;
    while (current) {
      if (current.userData?.elementType) return current.userData;
      current = current.parent;
    }
    return null;
  }

  _shouldSkipPlacementIntersection(object) {
    let current = object;
    while (current) {
      if (
        current === this.previewMesh ||
        current === this.draggedItemMesh ||
        current === this.placementIndicator
      ) {
        return true;
      }
      if (current.userData?.isPreview || current.userData?.isGhost) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  _getPlacementSurfaceHint(raycaster) {
    if (!this.planData?.plan) return null;

    const intersections = raycaster.intersectObject(this.planData.plan, true);
    const hiddenWallMeshes = wallVisibilityManager.hiddenWallMeshes;

    for (const intersection of intersections) {
      let current = intersection.object;
      let hidden = false;

      while (current) {
        if (hiddenWallMeshes.has(current)) {
          hidden = true;
          break;
        }
        current = current.parent;
      }

      if (
        hidden ||
        this._shouldSkipPlacementIntersection(intersection.object)
      ) {
        continue;
      }

      const elementData = this._getRaycastElementData(intersection.object);
      if (!elementData) continue;

      if (elementData.elementType === "lines") {
        return {
          type: SNAP_3D_WALL,
          wallLineID: elementData.elementID,
          point: intersection.point.clone(),
        };
      }

      if (elementData.elementType === "areas") {
        if (intersection.object.name !== "floor") continue;
        return {
          type: "floor",
          areaID: elementData.elementID,
          point: intersection.point.clone(),
        };
      }

      if (elementData.elementType === "items") {
        return {
          type: SNAP_3D_ITEM,
          itemID: elementData.elementID,
          point: intersection.point.clone(),
        };
      }
    }

    return null;
  }

  componentDidMount() {
    // Reconfigure renderer on every mount (fixes texture loss on 2D↔3D switch)
    this.renderer.outputColorSpace = Three.SRGBColorSpace;
    this.renderer.toneMapping = Three.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    let actions = {
      areaActions: this.context.areaActions,
      holesActions: this.context.holesActions,
      itemsActions: this.context.itemsActions,
      linesActions: this.context.linesActions,
      projectActions: this.context.projectActions,
    };

    let { state } = this.props;
    let data = state.scene;
    let canvasWrapper = this.canvasWrapperRef.current;

    let scene3D = new Three.Scene();
    let world = new Three.Group();
    scene3D.add(world);
    let axisHelper = new Three.AxesHelper(100);
    scene3D.add(axisHelper);
    // sky sphere with blue at top, white at horizon
    const skyGeometry = new Three.SphereGeometry(100000, 32, 15);
    const skyMaterial = new Three.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          // Blue at top (y=1), blend to white at horizon (y=0)
          vec3 skyBlue = vec3(0.53, 0.81, 0.92);  // Light sky blue
          vec3 white = vec3(1.0, 1.0, 1.0);
          vec3 color = mix(white, skyBlue, smoothstep(0.0, 0.5, h));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: Three.BackSide,
      depthWrite: false,
    });
    const sky = new Three.Mesh(skyGeometry, skyMaterial);
    scene3D.add(sky);

    //RENDERER
    this.renderer.setSize(this.width, this.height);

    let aspectRatio = this.width / this.height;
    let camera = new Three.PerspectiveCamera(45, aspectRatio, 1, 300000);

    // Main directional light (sun-like)
    let directionalLight = new Three.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = false;
    world.add(directionalLight);

    // Camera spotlight that follows the camera
    let cameraSpotlight = new Three.SpotLight(0xffffff, 1.0, 0);
    cameraSpotlight.angle = Math.PI / 4;
    cameraSpotlight.penumbra = 0.3;
    cameraSpotlight.decay = 2;
    camera.add(cameraSpotlight);

    scene3D.add(camera);

    // create orbit controls
    let orbitController = new OrbitControls(camera, this.renderer.domElement);

    // Track orbit state so we can hide guides during panning
    this._isOrbiting = false;
    this._onOrbitStart = () => {
      this._isOrbiting = true;
      this._markSceneDirty();
    };
    this._onOrbitChange = () => {
      this._markSceneDirty();
    };
    this._onOrbitEnd = () => {
      this._isOrbiting = false;
      this._markSceneDirty();
    };
    orbitController.addEventListener("start", this._onOrbitStart);
    orbitController.addEventListener("change", this._onOrbitChange);
    orbitController.addEventListener("end", this._onOrbitEnd);

    // Callback to initialize camera position after first bounding box update
    const onBoundingBoxReady = (planData) => {
      let cameraPositionX =
        planData.boundingBoxCenter.x - planData.boundingBoxCenter.lenX;
      let cameraPositionZ =
        planData.boundingBoxCenter.z + planData.boundingBoxCenter.lenZ;
      orbitController.target.set(
        planData.boundingBoxCenter.x,
        planData.boundingBoxCenter.y,
        planData.boundingBoxCenter.z,
      );
      camera.position.set(cameraPositionX, 500, cameraPositionZ);
      camera.up = new Three.Vector3(0, 1, 0);
      directionalLight.position.set(
        cameraPositionX + 50,
        500,
        cameraPositionZ + 50,
      );

      // If the bounding box was computed from real geometry mark camera as ready
      if (planData.boundingBoxHasGeometry) {
        this._cameraInitializedWithContent = true;
      }

      this._markSceneDirty();
    };

    // LOAD DATA
    let planData = parseData(
      data,
      actions,
      this.context.catalog,
      onBoundingBoxReady,
    );

    scene3D.add(planData.plan);
    scene3D.add(planData.grid);
    scene3D.add(planData.raycastPlane); // invisible mesh for reliable raycasting
    planData.world = world;
    this._refreshLodEntries(planData);

    // AMBIENT LIGHT - provides base illumination
    let ambientLight = new Three.AmbientLight(0xffffff, 0.6);
    world.add(ambientLight);

    // Add hemisphere light for natural outdoor lighting
    let hemisphereLight = new Three.HemisphereLight(0xffffbb, 0x080820, 0.5);
    world.add(hemisphereLight);

    // OBJECT PICKING
    let toIntersect = [planData.plan];
    let mouse = new Three.Vector2();
    let raycaster = new Three.Raycaster();

    // ── Gizmo manager ──
    this.gizmoManager = new SelectionGizmoManager(
      scene3D,
      camera,
      this.renderer.domElement,
    );

    // ── Hole measurement guides ──
    this.holeMeasurementGuides = new HoleMeasurementGuides(scene3D);

    // ── Measure tool (point-to-point) ──
    this.measureTool = new MeasureTool(scene3D, camera, this.renderer);
    // Expose on window for TopNavigationBar to read unit
    window.__viewer3DMeasureTool = this.measureTool;

    this.mouseDownEvent = (event) => {
      const mode = this.props.state.get("mode");

      // Track mouse down time and position for all clicks
      this.mouseDownTime = Date.now();
      this.mouseDownPosition.x = event.offsetX;
      this.mouseDownPosition.y = event.offsetY;

      // If in item placement mode with left-click, prevent default but allow drag for orbit controls
      if (
        mode === MODE_DRAWING_ITEM_3D &&
        this.previewMesh &&
        event.button === 0
      ) {
        event.preventDefault();
        return;
      }

      // If in hole placement mode with left-click, prevent default but allow drag for orbit controls
      if (
        mode === MODE_DRAWING_HOLE_3D &&
        this.holePreviewBoundingBox &&
        event.button === 0
      ) {
        event.preventDefault();
        return;
      }

      // If in 3D dragging mode, handle the drag start
      if (mode === MODE_DRAGGING_ITEM_3D && event.button === 0) {
        event.preventDefault();
        return;
      }

      // Check if clicking on a selected item to start 3D dragging
      if (
        (mode === MODE_3D_VIEW || mode === MODE_IDLE) &&
        event.button === 0 &&
        !this.isDragging3D
      ) {
        // Guard against null planData during view transitions
        if (!this.planData || !this.planData.sceneGraph) {
          return;
        }

        mouse.x = (event.offsetX / this.width) * 2 - 1;
        mouse.y = -(event.offsetY / this.height) * 2 + 1;

        // ── Gizmo-first: if user clicked a translation arrow / rotation ring,
        //    start the axis-constrained gizmo drag and consume the event. ──
        if (
          this.gizmoManager &&
          this.gizmoManager.handleMouseDown(mouse.x, mouse.y)
        ) {
          this.orbitControls.enabled = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        raycaster.setFromCamera(mouse, camera);

        // Find if we're clicking on a selected item
        const scene = this.props.state.get("scene");
        const selectedLayer = scene.get("selectedLayer");
        const layer = scene.getIn(["layers", selectedLayer]);

        if (layer) {
          const items = layer.get("items");
          let clickedSelectedItem = null;
          let clickedItemMesh = null;

          // Cache the sceneGraph items map once to avoid repeated deep lookups
          const sceneItems =
            this.planData.sceneGraph.layers[selectedLayer]?.items;

          sceneItems &&
            items.find((item, itemID) => {
              if (!item.selected) return false;
              const mesh = sceneItems[itemID];
              if (!mesh) return false;
              try {
                const itemIntersects = raycaster.intersectObject(mesh, true);
                if (itemIntersects.length > 0) {
                  clickedSelectedItem = {
                    itemID,
                    layerID: selectedLayer,
                    item,
                  };
                  clickedItemMesh = mesh;
                  return true;
                }
              } catch (e) {}
              return false;
            });

          if (clickedSelectedItem && clickedItemMesh) {
            // Start 3D dragging mode - use the actual mesh
            this.isDragging3D = true;
            this.draggedItemID = clickedSelectedItem.itemID;
            this.draggedItemLayerID = clickedSelectedItem.layerID;
            this.draggedItemMesh = clickedItemMesh;

            // Reset snap state for a fresh drag session
            this.snapState.reset();

            // Save original position for cancel
            this.dragStartPosition = {
              x: clickedItemMesh.position.x,
              y: clickedItemMesh.position.y,
              z: clickedItemMesh.position.z,
              rotationY: clickedItemMesh.rotation.y,
            };

            this.currentRotation = clickedItemMesh.rotation.y;

            // Compute the item's local-space bounding box extents for edge-based snapping
            this.draggedItemFootprint = computeItemFootprint(clickedItemMesh);
            // Create placement indicator only
            this.placementIndicator = createPlacementIndicator(50, 0x00ff00);
            this.placementIndicator.position.set(
              clickedItemMesh.position.x,
              0.5,
              clickedItemMesh.position.z,
            );
            this.planData.plan.add(this.placementIndicator);

            // Disable orbit controls during drag
            this.orbitControls.enabled = false;

            // Add window-level mouseup to catch releases outside the canvas
            this._endDragOnWindowMouseUp = (e) => {
              if (e.button === 0 && this.isDragging3D) {
                this._finishDrag();
              }
            };
            window.addEventListener("mouseup", this._endDragOnWindowMouseUp);

            // Begin 3D dragging in state
            const item = clickedSelectedItem.item;
            this.context.itemsActions.beginDraggingItem3D(
              clickedSelectedItem.layerID,
              clickedSelectedItem.itemID,
              item.x,
              item.y,
              item.properties.height || 0,
            );

            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
      }

      this.lastMousePosition.x = (event.offsetX / this.width) * 2 - 1;
      this.lastMousePosition.y = (-event.offsetY / this.height) * 2 + 1;
    };

    this.mouseUpEvent = (event) => {
      // Guard against duplicate listener fire (capture-phase listeners accumulate
      // when removeEventListener is called without the capture flag during unmount).
      // Two listeners on the same element fire for the same event timeStamp.
      if (this._lastMouseUpStamp === event.timeStamp) return;
      this._lastMouseUpStamp = event.timeStamp;

      // Check if in 3D placement mode first - only handle left-click
      const mode = this.props.state.get("mode");

      // ── Gizmo drag completion ──
      if (
        this.gizmoManager &&
        this.gizmoManager.isDragging &&
        event.button === 0
      ) {
        event.preventDefault();
        event.stopPropagation();
        const result = this.gizmoManager.handleMouseUp();
        if (this.orbitControls) this.orbitControls.enabled = true;
        this.renderer.domElement.style.cursor = "";
        if (result) this._commitGizmoDrag(result);
        return;
      }

      // Handle 3D dragging completion
      if (
        (mode === MODE_DRAGGING_ITEM_3D || this.isDragging3D) &&
        event.button === 0
      ) {
        event.preventDefault();
        event.stopPropagation();
        this._finishDrag();
        return;
      }

      // ── Measure tool click ──
      if (mode === MODE_3D_MEASURE && this.measureTool && event.button === 0) {
        const clickDuration = Date.now() - this.mouseDownTime;
        const dx = Math.abs(event.offsetX - this.mouseDownPosition.x);
        const dy = Math.abs(event.offsetY - this.mouseDownPosition.y);
        if (clickDuration < 300 && Math.sqrt(dx * dx + dy * dy) < 5) {
          event.preventDefault();
          // stopImmediatePropagation prevents a second duplicate capture-phase
          // listener (from React double-mount in StrictMode) from also firing.
          event.stopImmediatePropagation();
          this.measureTool.onClick();
        }
        return;
      }

      if (
        mode === MODE_DRAWING_ITEM_3D &&
        this.previewMesh &&
        event.button === 0
      ) {
        event.preventDefault();

        // Calculate time held and distance moved
        const clickDuration = Date.now() - this.mouseDownTime;
        const dx = Math.abs(event.offsetX - this.mouseDownPosition.x);
        const dy = Math.abs(event.offsetY - this.mouseDownPosition.y);
        const distanceMoved = Math.sqrt(dx * dx + dy * dy);

        // Only place if it was a quick click (< 200ms) and mouse didn't move much (< 5px)
        // This prevents placement when dragging for orbit controls
        if (clickDuration < 200 && distanceMoved < 5) {
          event.stopPropagation();

          const layerID = this.props.state.getIn(["scene", "selectedLayer"]);
          const pos = this.previewMesh.position;

          // Convert 3D world coordinates to 2D plan coordinates
          const x2D = pos.x;
          const y2D = -pos.z;

          // Clean up preview mesh and indicator
          this.cleanupPreview();

          // Place the item
          this.context.itemsActions.endDrawingItem3D(layerID, x2D, pos.y, y2D);
          this.context.projectActions.setMode(MODE_3D_VIEW);
        }
        return;
      }

      // Handle hole placement in 3D mode
      if (
        mode === MODE_DRAWING_HOLE_3D &&
        this.holePreviewBoundingBox &&
        event.button === 0
      ) {
        event.preventDefault();

        // Calculate time held and distance moved
        const clickDuration = Date.now() - this.mouseDownTime;
        const dx = Math.abs(event.offsetX - this.mouseDownPosition.x);
        const dy = Math.abs(event.offsetY - this.mouseDownPosition.y);
        const distanceMoved = Math.sqrt(dx * dx + dy * dy);

        // Only place if it was a quick click and mouse didn't move much
        if (
          clickDuration < 500 &&
          distanceMoved < 10 &&
          this.holePlacementLine
        ) {
          event.stopPropagation();

          const layerID = this.props.state.getIn(["scene", "selectedLayer"]);
          const pos = this.holePreviewBoundingBox.position.clone(); // Clone to preserve values
          const lineID = this.holePlacementLine.id; // Store before cleanup
          const offset = this.holePlacementOffset; // Store the calculated offset

          // Calculate the final altitude (accounting for box offset)
          const finalAltitude =
            this.holeDefaultAltitude + this.holeAltitudeAdjustment;

          // Clean up preview mesh FIRST (this nulls holePlacementLine)
          this.cancelHolePlacement();

          // Now place the hole with stored values
          this.context.holesActions.endDrawingHole3D(
            layerID,
            pos.x,
            finalAltitude,
            pos.z, // Pass pos.z directly, not -pos.z
            lineID,
            offset,
          );
          this.context.projectActions.setMode(MODE_3D_VIEW);
        }
        return;
      }

      event.preventDefault();

      mouse.x = (event.offsetX / this.width) * 2 - 1;
      mouse.y = -(event.offsetY / this.height) * 2 + 1;

      if (
        Math.abs(mouse.x - this.lastMousePosition.x) <= 0.02 &&
        Math.abs(mouse.y - this.lastMousePosition.y) <= 0.02
      ) {
        raycaster.setFromCamera(mouse, camera);

        // Filter out preview/placement objects and validate geometry before raycasting
        const validObjects = [];
        toIntersect.forEach((obj) => {
          if (obj.userData && (obj.userData.isGhost || obj.userData.isPreview))
            return; // Skip preview

          let hasValidGeometry = false;
          obj.traverse((child) => {
            // Check if this child has valid geometry for raycasting
            if (child.isMesh && child.geometry && !child.geometry.isDisposed) {
              hasValidGeometry = true;
            }
            // Mark preview children to skip
            if (
              child.userData &&
              (child.userData.isGhost || child.userData.isPreview)
            ) {
              hasValidGeometry = false;
            }
          });

          if (hasValidGeometry) {
            validObjects.push(obj);
          }
        });

        // Reuse the hidden wall set maintained by wallVisibilityManager
        const hiddenWallMeshes = wallVisibilityManager.hiddenWallMeshes;

        let intersects = [];
        try {
          intersects = raycaster.intersectObjects(validObjects, true);

          // Filter out intersections with hidden walls
          intersects = intersects.filter((intersection) => {
            // Check if this intersection is part of a hidden wall
            let obj = intersection.object;
            while (obj) {
              if (hiddenWallMeshes.has(obj)) {
                return false; // Skip this intersection
              }
              obj = obj.parent;
            }
            return true; // Keep this intersection
          });
        } catch (error) {}

        if (intersects.length > 0 && !isNaN(intersects[0].distance)) {
          // Handle texture application mode
          const currentMode = this.props.state.get("mode");
          if (currentMode === MODE_APPLYING_TEXTURE) {
            const textureApplication =
              this.props.state.get("textureApplication");
            if (textureApplication) {
              const textureKey = textureApplication.get("textureKey");
              const targetType = textureApplication.get("targetType");

              // Find the element associated with the closest intersection
              for (let i = 0; i < intersects.length; i++) {
                const intersection = intersects[i];
                let obj = intersection.object;
                let elementData = null;

                // Traverse up the parent chain to find an object with userData.elementType
                while (obj) {
                  if (obj.userData && obj.userData.elementType) {
                    elementData = obj.userData;
                    break;
                  }
                  obj = obj.parent;
                }

                if (!elementData) continue;

                const { elementType, elementID, layerID } = elementData;

                // Apply wall texture
                if (targetType === "wall" && elementType === "lines") {
                  const materialIndex = intersection.face
                    ? intersection.face.materialIndex
                    : -1;

                  // Only apply to front (0) or back (1) faces, not top/bottom/sides
                  if (materialIndex === 0 || materialIndex === 1) {
                    // Get sideAInside from the element state
                    const lineElement = this.props.state.getIn([
                      "scene",
                      "layers",
                      layerID,
                      "lines",
                      elementID,
                    ]);
                    if (lineElement) {
                      const sideAInside = lineElement.getIn([
                        "properties",
                        "sideAInside",
                      ]);
                      // materialTextureA = sideAInside ? 1 : 0
                      // materialTextureB = sideAInside ? 0 : 1
                      const materialTextureA = sideAInside ? 1 : 0;

                      let propertyName;
                      if (materialIndex === materialTextureA) {
                        propertyName = "textureA";
                      } else {
                        propertyName = "textureB";
                      }

                      this.context.textureActions.applyTextureToElement(
                        layerID,
                        elementID,
                        "lines",
                        propertyName,
                        textureKey,
                      );
                    }
                  } else {
                  }
                  break;
                }

                // Apply floor texture
                if (targetType === "floor" && elementType === "areas") {
                  this.context.textureActions.applyTextureToElement(
                    layerID,
                    elementID,
                    "areas",
                    "texture",
                    textureKey,
                  );
                  break;
                }
              }
              return; // Don't process normal interact when in texture mode
            }
          }

          // Find the closest intersection that has an interact function
          // We need to traverse up the parent chain to find the interact handler
          let interactFound = false;
          for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            // Traverse up the parent chain to find an object with interact
            while (obj) {
              if (obj.interact) {
                obj.interact();
                interactFound = true;
                break;
              }
              obj = obj.parent;
            }
            if (interactFound) break;
          }
          if (!interactFound) {
            this.context.projectActions.unselectAll();
          }
        } else {
          this.context.projectActions.unselectAll();
        }
      }
    };

    // Mouse move handler for 3D placement, dragging, and cursor tracking
    this.mouseMoveEvent = (event) => {
      // Guard against null planData (can happen during view switching)
      if (!this.planData || !this.planData.raycastPlane) {
        return;
      }

      const mode = this.props.state.get("mode");

      // Always track cursor position for preview mesh placement
      mouse.x = (event.offsetX / this.width) * 2 - 1;
      mouse.y = -(event.offsetY / this.height) * 2 + 1;

      // ── Gizmo drag in progress: pass mouse to gizmo manager, skip everything else ──
      if (this.gizmoManager && this.gizmoManager.isDragging) {
        this.gizmoManager.handleMouseMove(mouse.x, mouse.y);
        this._markSceneDirty();
        return;
      }

      raycaster.setFromCamera(mouse, camera);

      // Raycast against the invisible plane mesh (NOT the LineSegments grid).
      // Three.js line raycasting on LineSegments returns the closest point on
      // any line to the ray — not a true surface hit — causing the spurious
      // near-origin x≈0 z≈0 result on alternating frames that produces flicker.
      const intersects = raycaster.intersectObject(
        this.planData.raycastPlane,
        false,
      );
      const surfaceHint = this._getPlacementSurfaceHint(raycaster);
      const intersectionPoint =
        surfaceHint?.point ||
        (intersects.length > 0 ? intersects[0].point : null);

      if (intersectionPoint) {
        // Apply snapping (edge-based when we have footprint data)
        const scene = this.props.state.get("scene");
        const excludeItemID = this.isDragging3D ? this.draggedItemID : null;
        const isPlacing = mode === MODE_DRAWING_ITEM_3D && this.previewMesh;
        const isDragging =
          (mode === MODE_DRAGGING_ITEM_3D || this.isDragging3D) &&
          this.draggedItemMesh;
        const activeFootprint = isDragging
          ? this.draggedItemFootprint
          : isPlacing
            ? this.previewItemFootprint
            : null;

        const dragContext = {
          footprint: activeFootprint,
          sceneGraph: this.planData?.sceneGraph,
          currentRotation: this.currentRotation,
          surfaceHint,
        };

        const snapResult = applySnapping(
          intersectionPoint.x,
          intersectionPoint.z,
          scene,
          this.snapConfig,
          excludeItemID,
          this.snapState,
          dragContext,
        );

        // Store cursor position (snapped)
        this.currentCursor3D = {
          x: snapResult.x,
          z: snapResult.z,
          valid: true,
          snapType: snapResult.snapType,
          snapped: snapResult.snapped,
        };

        // Handle placement mode - move preview mesh
        if (isPlacing) {
          // Move preview pivot — keep it at floor surface so inner mesh is on top of slab
          this.previewMesh.position.set(
            snapResult.x,
            this.currentFloorThickness || 0,
            snapResult.z,
          );
          this.previewMesh.rotation.y = this.currentRotation;
        }

        if (isDragging) {
          // Move mesh directly — no Redux update during drag
          const dragY = this.dragStartPosition ? this.dragStartPosition.y : 0;

          // Auto-rotate to face away from wall when wall-snapping (instant snap)
          if (
            snapResult.snapped &&
            snapResult.snapType === SNAP_3D_WALL &&
            snapResult.snapInfo?.suggestedRotation !== undefined
          ) {
            const suggested = snapResult.snapInfo.suggestedRotation;
            if (this.targetRotation !== suggested) {
              this.targetRotation = suggested;
              this.currentRotation = suggested;
            }
          } else {
            this.targetRotation = null;
          }

          this.draggedItemMesh.position.set(snapResult.x, dragY, snapResult.z);
          this.draggedItemMesh.rotation.y = this.currentRotation;

          // Update snap indicator
          if (this.placementIndicator) {
            this.placementIndicator.position.set(
              snapResult.x,
              0.5,
              snapResult.z,
            );
            if (
              snapResult.snapped &&
              this.currentSnapType !== snapResult.snapType
            ) {
              this.currentSnapType = snapResult.snapType;
              updateSnapIndicatorColor(
                this.placementIndicator,
                snapResult.snapType,
              );
            }
          }
        }

        // Handle hole placement mode - move hole bounding box to nearest wall
        if (mode === MODE_DRAWING_HOLE_3D && this.holePreviewBoundingBox) {
          // Store cursor for altitude adjustments
          this.currentCursor3D.x = intersectionPoint.x;
          this.currentCursor3D.z = intersectionPoint.z;
          this.updateHolePreviewPosition(
            intersectionPoint.x,
            intersectionPoint.z,
          );
        }

        // Handle hole dragging mode
        if (mode === MODE_DRAGGING_HOLE_3D && this.isDraggingHole3D) {
          const snapInfo = this.updateHolePreviewPosition(
            intersectionPoint.x,
            intersectionPoint.z,
          );
          if (snapInfo) {
            this.context.holesActions.updateDraggingHole3D(
              snapInfo.position.x,
              0,
              -snapInfo.position.y,
              snapInfo.lineID,
            );
          }
        }

        // ── Measure tool tracking ──
        if (mode === MODE_3D_MEASURE && this.measureTool) {
          this.measureTool.setUnit(
            this.props.state.getIn(["scene", "unit"]) || "cm",
          );
          this.measureTool.onMouseMove(
            mouse,
            planData,
            this.props.state.get("scene"),
          );
          this.renderer.domElement.style.cursor = "crosshair";
        }
      } else {
        this.currentCursor3D.valid = false;
      }

      // ── Hover detection & gizmo arrow highlight (idle / view mode only) ──
      if (
        this.gizmoManager &&
        !this.isDragging3D &&
        (mode === MODE_3D_VIEW || mode === MODE_IDLE)
      ) {
        // Build set of hidden wall meshes for filtering (includes holes of hidden walls)
        const hiddenMeshes = wallVisibilityManager.hiddenWallMeshes;
        const hiddenHoleIDs = wallVisibilityManager.hiddenHoleIDs;
        this.gizmoManager.updateHover(
          mouse.x,
          mouse.y,
          toIntersect,
          hiddenMeshes,
          hiddenHoleIDs,
        );
        this.gizmoManager.highlightGizmoOnHover(mouse.x, mouse.y);

        // Cursor hint
        if (this.gizmoManager.isOverGizmo(mouse.x, mouse.y)) {
          this.renderer.domElement.style.cursor = "grab";
        } else if (this.gizmoManager.hoverTarget) {
          this.renderer.domElement.style.cursor = "pointer";
        } else {
          this.renderer.domElement.style.cursor = "";
        }
      }

      this._markSceneDirty();
    };

    // Keyboard handler for rotation and cancellation
    this.keyDownEvent = (event) => {
      // Don't handle keyboard shortcuts if user is typing in an input field
      const target = event.target;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputField) {
        // Allow normal input behavior, don't intercept
        return;
      }

      const mode = this.props.state.get("mode");

      // ── Gizmo drag: Escape to cancel ──
      if (
        this.gizmoManager &&
        this.gizmoManager.isDragging &&
        event.key === "Escape"
      ) {
        event.preventDefault();
        this.gizmoManager.cancelDrag();
        if (this.orbitControls) this.orbitControls.enabled = true;
        this._markSceneDirty();
        return;
      }

      // Handle texture application mode - Escape to cancel
      if (mode === MODE_APPLYING_TEXTURE) {
        if (event.key === "Escape") {
          event.preventDefault();
          if (this.context.textureActions) {
            this.context.textureActions.cancelTextureApplication();
          }
          return;
        }
      }

      // Handle item placement and dragging modes
      if (
        mode === MODE_DRAWING_ITEM_3D ||
        mode === MODE_DRAGGING_ITEM_3D ||
        this.isDragging3D
      ) {
        if (event.key === "r" || event.key === "R") {
          event.preventDefault();
          this.currentRotation += Math.PI / 4; // Rotate 45 degrees
          // Rotate appropriate mesh
          if (this.previewMesh) {
            this.previewMesh.rotation.y = this.currentRotation;
          }
          if (this.draggedItemMesh) {
            this.draggedItemMesh.rotation.y = this.currentRotation;
          }
          this._markSceneDirty();
        } else if (event.key === "Escape") {
          event.preventDefault();
          if (mode === MODE_DRAGGING_ITEM_3D || this.isDragging3D) {
            this.cancelDragging();
          } else {
            this.cancelPlacement();
          }
        } else if (event.key === "s" || event.key === "S") {
          // Toggle snapping
          event.preventDefault();
          this.snapConfig.enabled = !this.snapConfig.enabled;
        }
      }

      // Handle hole placement and dragging modes
      if (
        mode === MODE_DRAWING_HOLE_3D ||
        mode === MODE_DRAGGING_HOLE_3D ||
        this.isDraggingHole3D
      ) {
        if (event.key === "Escape") {
          event.preventDefault();
          if (mode === MODE_DRAGGING_HOLE_3D || this.isDraggingHole3D) {
            this.cancelHoleDragging();
          } else {
            this.cancelHolePlacement();
          }
        } else if (
          mode === MODE_DRAWING_HOLE_3D &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          // Altitude adjustment for windows only
          const holeType = this.props.state.getIn(["drawingSupport", "type"]);
          if (holeType && holeType.toLowerCase().includes("window")) {
            event.preventDefault();
            const adjustmentStep = 10; // 10 units per keypress
            if (event.key === "ArrowUp") {
              this.holeAltitudeAdjustment += adjustmentStep;
            } else {
              this.holeAltitudeAdjustment -= adjustmentStep;
            }
            // Trigger position update to reflect new altitude
            if (this.currentCursor3D.valid) {
              this.updateHolePreviewPosition(
                this.currentCursor3D.x,
                this.currentCursor3D.z,
              );
            }
            this._markSceneDirty();
          }
        }
      }

      // Handle measure tool Escape
      if (mode === MODE_3D_MEASURE && event.key === "Escape") {
        event.preventDefault();
        if (this.measureTool) {
          if (this.measureTool.active) {
            this.measureTool.cancel();
          } else {
            this.measureTool.clearAll();
            this.context.projectActions.setMode(MODE_3D_VIEW);
          }
        }
      }
    };

    // add the output of the renderer to the html element
    canvasWrapper.appendChild(this.renderer.domElement);

    // Add event listeners with capture phase to intercept before OrbitControls
    this.renderer.domElement.addEventListener(
      "mousedown",
      this.mouseDownEvent,
      true,
    );
    this.renderer.domElement.addEventListener(
      "mouseup",
      this.mouseUpEvent,
      true,
    );
    this.renderer.domElement.addEventListener(
      "mousemove",
      this.mouseMoveEvent,
      true,
    );
    window.addEventListener("keydown", this.keyDownEvent);
    this.renderer.domElement.style.display = "block";

    // Set camera spotlight to point forward
    cameraSpotlight.target.position.set(0, 0, -1);
    camera.add(cameraSpotlight.target);

    this.orbitControls = orbitController;
    this.camera = camera;
    this.scene3D = scene3D;
    this.world = world;
    this.planData = planData;
    this.cameraSpotlight = cameraSpotlight;
    this.directionalLight = directionalLight;

    // Expose for mini-preview viewport
    window.__viewer3D = this;
    window.addEventListener(
      "planner:view-settings-change",
      this.handleExternalViewSettingsChange,
    );

    // Initialize wall visibility manager
    wallVisibilityManager.init(planData, camera);

    // Apply initial view settings
    this.applyViewSettings(this.viewSettings);
    this.setGestureZoomEnabled(this.viewSettings.gestureZoom);

    if (window.__plannerViewSettings) {
      this.handleViewSettingsChange({
        ...DEFAULT_SETTINGS,
        ...window.__plannerViewSettings,
      });
    }

    // Initial gizmo sync — if anything is already selected when switching to 3D
    if (this.gizmoManager) {
      this.gizmoManager.updateSelection(
        this.props.state.get("scene"),
        this.planData.sceneGraph,
      );
    }

    this._setViewerActive(this.props.isActive);
  }

  componentWillUnmount() {
    this._stopRenderLoop();

    window.removeEventListener(
      "planner:view-settings-change",
      this.handleExternalViewSettingsChange,
    );

    if (this.orbitControls) {
      if (this._onOrbitStart)
        this.orbitControls.removeEventListener("start", this._onOrbitStart);
      if (this._onOrbitChange)
        this.orbitControls.removeEventListener("change", this._onOrbitChange);
      if (this._onOrbitEnd)
        this.orbitControls.removeEventListener("end", this._onOrbitEnd);
      this.orbitControls.dispose();
    }

    const domElement = this.renderer && this.renderer.domElement;
    if (domElement) {
      domElement.removeEventListener("mousedown", this.mouseDownEvent, true);
      domElement.removeEventListener("mouseup", this.mouseUpEvent, true);
      domElement.removeEventListener("mousemove", this.mouseMoveEvent, true);
    }
    window.removeEventListener("keydown", this.keyDownEvent);

    if (this.handGestureController) {
      this.handGestureController.dispose();
      this.handGestureController = null;
    }

    // Clean up window-level drag mouseup listener
    if (this._endDragOnWindowMouseUp) {
      window.removeEventListener("mouseup", this._endDragOnWindowMouseUp);
      this._endDragOnWindowMouseUp = null;
    }

    // Clean up placement and dragging
    this.cleanupPreview();
    this.isDragging3D = false;
    this.draggedItemMesh = null;
    this.dragStartPosition = null;

    // Preserve snapshot for SmartPreview mini-view before removing objects
    if (window.__viewer3D === this) {
      window.__viewer3DSnapshot = {
        scene3D: this.scene3D,
        planData: this.planData,
      };
      window.__viewer3D = null;
    }

    // DON'T dispose shared renderer/scene resources — they're cached and reused
    if (this.planData && this.world) {
      this.world.remove(this.planData.plan);
      this.world.remove(this.planData.grid);
      if (this.scene3D && this.planData.raycastPlane) {
        this.scene3D.remove(this.planData.raycastPlane);
      }
    }

    // Clean up wall visibility manager
    wallVisibilityManager.dispose();

    // Clean up gizmo manager
    if (this.gizmoManager) {
      this.gizmoManager.dispose();
      this.gizmoManager = null;
    }

    // Clean up hole measurement guides
    if (this.holeMeasurementGuides) {
      this.holeMeasurementGuides.dispose();
      this.holeMeasurementGuides = null;
    }

    // Clean up measure tool
    if (this.measureTool) {
      this.measureTool.dispose();
      this.measureTool = null;
      window.__viewer3DMeasureTool = null;
    }

    this.scene3D = null;
    this.world = null;
    this.planData = null;
    this.camera = null;
    this.orbitControls = null;
  }

  componentDidUpdate(prevProps) {
    let { width, height } = this.props;

    let actions = {
      areaActions: this.context.areaActions,
      holesActions: this.context.holesActions,
      itemsActions: this.context.itemsActions,
      linesActions: this.context.linesActions,
      projectActions: this.context.projectActions,
    };

    this.width = width;
    this.height = height;

    if (prevProps.isActive !== this.props.isActive) {
      this._setViewerActive(this.props.isActive);
    }

    // Detect NEW_PROJECT / LOAD_PROJECT.
    // Rely on history reset + scene identity change for reliability, and keep
    // first-scene hash as a secondary signal (for loads without prior history).
    const prevFirstScene =
      prevProps.state && prevProps.state.sceneHistory
        ? prevProps.state.sceneHistory.first
        : null;
    const nextFirstScene =
      this.props.state && this.props.state.sceneHistory
        ? this.props.state.sceneHistory.first
        : null;
    const firstSceneChanged = (() => {
      if (!prevFirstScene || !nextFirstScene) return false;
      if (
        typeof prevFirstScene.hashCode === "function" &&
        typeof nextFirstScene.hashCode === "function"
      ) {
        return prevFirstScene.hashCode() !== nextFirstScene.hashCode();
      }
      return prevFirstScene !== nextFirstScene;
    })();
    const prevHistorySize =
      prevProps.state.getIn(["sceneHistory", "list", "size"]) || 0;
    const nextHistorySize =
      this.props.state.getIn(["sceneHistory", "list", "size"]) || 0;
    const historyReset = prevHistorySize > 0 && nextHistorySize === 0;
    const sceneIdentityChanged =
      this.props.state.scene !== prevProps.state.scene;
    const projectChanged =
      sceneIdentityChanged && (historyReset || firstSceneChanged);

    if (projectChanged) {
      this._pendingRecenterAfterProjectChange = true;
      this._cameraInitializedWithContent = false;

      // Viewer3D is intentionally kept mounted across projects; reset wall
      // visibility internal caches so previous project's wall states don't leak.
      wallVisibilityManager.dispose();
      if (this.planData && this.camera) {
        wallVisibilityManager.init(this.planData, this.camera);
      }

      // Prevent recentering against stale bounds while the new scene is still building.
      if (this.planData) {
        this.planData.boundingBox = null;
      }
    }

    // Handle mode changes for 3D placement
    const currentMode = prevProps.state.get("mode");
    const nextMode = this.props.state.get("mode");
    const sceneChanged = this.props.state.scene !== prevProps.state.scene;

    if (
      nextMode === MODE_DRAWING_ITEM_3D &&
      currentMode !== MODE_DRAWING_ITEM_3D
    ) {
      const itemType = this.props.state.getIn(["drawingSupport", "type"]);
      this.createPreviewForItem(itemType);
      // Keep OrbitControls enabled for camera control during placement
    } else if (
      currentMode === MODE_DRAWING_ITEM_3D &&
      nextMode !== MODE_DRAWING_ITEM_3D
    ) {
      this.cancelPlacement();
    }

    // Handle mode changes for 3D hole placement
    if (
      nextMode === MODE_DRAWING_HOLE_3D &&
      currentMode !== MODE_DRAWING_HOLE_3D
    ) {
      const holeType = this.props.state.getIn(["drawingSupport", "type"]);
      this.createPreviewForHole(holeType);
    } else if (
      currentMode === MODE_DRAWING_HOLE_3D &&
      nextMode !== MODE_DRAWING_HOLE_3D
    ) {
      this.cancelHolePlacement();
    }

    // Handle mode changes for 3D hole dragging
    if (
      currentMode === MODE_DRAGGING_HOLE_3D &&
      nextMode !== MODE_DRAGGING_HOLE_3D &&
      !this.isDraggingHole3D
    ) {
      this.cancelHoleDragging();
    }

    // Handle drag-end for external mode cancellation (guard against double-cancel)
    if (
      currentMode === MODE_DRAGGING_ITEM_3D &&
      nextMode !== MODE_DRAGGING_ITEM_3D
    ) {
      if (this.isDragging3D) {
        this.cancelDragging();
      }
    }

    // Cancel measure tool when leaving measure mode
    if (currentMode === MODE_3D_MEASURE && nextMode !== MODE_3D_MEASURE) {
      if (this.measureTool) this.measureTool.cancel();
    }

    // Update scene when Redux state changes (position changes use a fast path, so safe after drag)
    if (this.props.state.scene !== prevProps.state.scene) {
      let changedValues = diff(prevProps.state.scene, this.props.state.scene);
      this._sceneDirtyForFrame = true;
      this._lodDirty = true;
      this._ensureRenderLoop();

      updateScene(
        this.planData,
        this.props.state.scene,
        prevProps.state.scene,
        changedValues.toJS(),
        actions,
        this.context.catalog,
        (pd) => {
          this._markSceneDirty();

          // If a project changed while already in 3D, recenter as soon as bounds are ready.
          if (!this._pendingRecenterAfterProjectChange) return;

          const modeNow = this.props.state.get("mode");
          const _3D_MODES = [
            MODE_3D_VIEW,
            MODE_DRAWING_ITEM_3D,
            MODE_DRAGGING_ITEM_3D,
            MODE_DRAWING_HOLE_3D,
            MODE_DRAGGING_HOLE_3D,
            MODE_APPLYING_TEXTURE,
            MODE_3D_MEASURE,
          ];
          const in3D = _3D_MODES.indexOf(modeNow) !== -1;
          if (!in3D) return;

          this._recenterCameraToPlanBounds(pd);
          this._pendingRecenterAfterProjectChange = false;
          this._cameraInitializedWithContent = true;
          this._markSceneDirty();
        },
      );
      // Sync selection / hover gizmos with updated scene
      if (this.gizmoManager) {
        this.gizmoManager.updateSelection(
          this.props.state.scene,
          this.planData.sceneGraph,
        );
      }

      // Update hole measurement guides on every scene change
      if (this.holeMeasurementGuides) {
        this.holeMeasurementGuides.update(
          this.props.state.scene,
          this.planData.sceneGraph,
          this.camera,
        );
      }

      // If actively dragging, refresh mesh reference in case updateScene rebuilt it
      if (this.isDragging3D && this.draggedItemID && this.draggedItemLayerID) {
        const refreshedMesh =
          this.planData.sceneGraph.layers[this.draggedItemLayerID] &&
          this.planData.sceneGraph.layers[this.draggedItemLayerID].items &&
          this.planData.sceneGraph.layers[this.draggedItemLayerID].items[
            this.draggedItemID
          ];
        if (refreshedMesh && refreshedMesh !== this.draggedItemMesh) {
          this.draggedItemMesh = refreshedMesh;
        }
      }

      this._markSceneDirty();
    }

    // Re-centre camera on first 3D entry that has real geometry
    const _3D_MODES = [
      MODE_3D_VIEW,
      MODE_DRAWING_ITEM_3D,
      MODE_DRAGGING_ITEM_3D,
      MODE_DRAWING_HOLE_3D,
      MODE_DRAGGING_HOLE_3D,
      MODE_APPLYING_TEXTURE,
      MODE_3D_MEASURE,
    ];
    const nowIn3D = _3D_MODES.indexOf(nextMode) !== -1;

    // If a project changed while in 2D, apply the one-time recenter on the first 2D→3D switch.
    if (
      nowIn3D &&
      this._pendingRecenterAfterProjectChange &&
      this.planData &&
      this.planData.boundingBox
    ) {
      this._recenterCameraToPlanBounds(this.planData);
      this._pendingRecenterAfterProjectChange = false;
      this._cameraInitializedWithContent = true;
      this._markSceneDirty();
    }

    if (
      nowIn3D &&
      !this._cameraInitializedWithContent &&
      this.planData &&
      this.planData.boundingBox &&
      this.planData.boundingBoxHasGeometry
    ) {
      // We have real geometry now — re-centre camera
      this._recenterCameraToPlanBounds(this.planData);
      this._cameraInitializedWithContent = true;
      this._markSceneDirty();
    }

    if (
      width !== this._lastRendererWidth ||
      height !== this._lastRendererHeight
    ) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this._lastRendererWidth = width;
      this._lastRendererHeight = height;
      this._markSceneDirty();
    }

    // Translate zoom scale changes into OrbitControls dolly movement
    const prevZoom = prevProps.state.get("zoom");
    const nextZoom = this.props.state.get("zoom");
    if (prevZoom && nextZoom && prevZoom !== nextZoom && this.orbitControls) {
      const factor = prevZoom / nextZoom; // >1 = zoom out, <1 = zoom in
      const dir = new Three.Vector3().subVectors(
        this.camera.position,
        this.orbitControls.target,
      );
      dir.multiplyScalar(factor);
      this.camera.position.copy(this.orbitControls.target).add(dir);
      this.orbitControls.update();
      this._markSceneDirty();
    }
  }

  /**
   * Commit gizmo drag result to Redux.
   */
  _commitGizmoDrag(result) {
    if (!result || !result.elementInfo) return;

    const info = result.elementInfo;

    if (info.elementType === "items") {
      if (result.type === "translate") {
        // Convert 3D position → 2D plan coordinates
        const x2D = result.position.x;
        const y2D = -result.position.z;

        // Use the standard begin → end cycle so reducers update correctly.
        // The mesh is already at the correct 3D position from the gizmo drag.
        this.context.itemsActions.beginDraggingItem3D(
          info.layerID,
          info.elementID,
          x2D,
          y2D,
          result.position.y,
        );
        this.context.itemsActions.endDraggingItem3D(x2D, y2D, 0);
      } else if (result.type === "rotate") {
        // Convert radians → degrees for Redux
        const rotDeg = ((result.rotation * 180) / Math.PI) % 360;
        // Use setItemsAttributes to update rotation on the selected item
        this.context.projectActions.setItemsAttributes(
          fromJS({ rotation: rotDeg }),
        );
      }
    } else if (info.elementType === "holes") {
      if (result.type === "translate") {
        if (result.axis === "y") {
          // Y-axis drag: constrain altitude within wall height limits
          const deltaY = result.position.y - result.startPosition.y;

          const fullProperties = this.props.state.getIn([
            "scene",
            "layers",
            info.layerID,
            "holes",
            info.elementID,
            "properties",
          ]);

          if (fullProperties) {
            const currentAltitude =
              fullProperties.getIn(["altitude", "length"]) || 0;
            const holeHeight =
              fullProperties.getIn(["height", "length"]) || 210;

            // Get wall height from the parent line
            const holeLineID = this.props.state.getIn([
              "scene",
              "layers",
              info.layerID,
              "holes",
              info.elementID,
              "line",
            ]);
            const wallHeight =
              this.props.state.getIn([
                "scene",
                "layers",
                info.layerID,
                "lines",
                holeLineID,
                "properties",
                "height",
                "length",
              ]) || 300;

            // Clamp so hole stays inside wall: 0 <= altitude <= wallHeight - holeHeight
            const maxAlt = Math.max(0, wallHeight - holeHeight);
            const newAltitude = Math.max(
              0,
              Math.min(maxAlt, currentAltitude + deltaY),
            );
            const updatedProperties = fullProperties.mergeIn(
              ["altitude"],
              fromJS({ length: newAltitude }),
            );
            this.context.projectActions.setProperties(updatedProperties);
          }
        } else {
          // X/Z-axis drag: update position along wall (can jump between walls)
          const x3D = result.position.x;
          const z3D = result.position.z;
          this.context.holesActions.beginDraggingHole3D(
            info.layerID,
            info.elementID,
            x3D,
            0,
            z3D,
          );
          // Defer so the first dispatch's render cycle completes before the
          // second one fires — prevents "update during state transition" warning.
          setTimeout(() => {
            this.context.holesActions.endDraggingHole3D(x3D, 0, z3D);
          }, 0);
        }
      }
    }
  }

  // Create a fully visible preview mesh for placing new items
  createPreviewForItem(itemType) {
    const catalog = this.context.catalog;
    const itemElement = catalog.getElement(itemType);

    if (itemElement && itemElement.render3D) {
      try {
        // Create a dummy element with Immutable properties
        let propertiesObj = {};
        if (itemElement.properties) {
          Object.keys(itemElement.properties).forEach((key) => {
            const prop = itemElement.properties[key];
            propertiesObj[key] = prop.defaultValue || {};
          });
        }

        // Create element as a plain object with Immutable properties Map
        const elementForRender = {
          id: "preview",
          type: itemType,
          prototype: "items",
          name: itemType,
          x: 0,
          y: 0,
          rotation: 0,
          selected: false,
          properties: fromJS(propertiesObj),
        };

        // Create a dummy scene object with unit for rendering
        const dummyScene = {
          unit: this.props.state.getIn(["scene", "unit"]) || "cm",
        };

        // Compute floor slab height so the preview hovers at the correct altitude
        let previewSlabHeight = 20;
        try {
          const sceneLayers = this.props.state.getIn(["scene", "layers"]);
          if (sceneLayers) {
            sceneLayers.forEach((lyr) => {
              lyr.get("areas").forEach((area) => {
                const ft = area.getIn([
                  "properties",
                  "floorThickness",
                  "length",
                ]);
                if (ft) {
                  previewSlabHeight = ft;
                  return false;
                }
              });
              return false; // only need first layer
            });
          }
        } catch (e) {
          /* use default */
        }
        this.currentFloorThickness = previewSlabHeight;

        const meshPromise = itemElement.render3D(
          elementForRender,
          null,
          dummyScene,
        );

        // Handle both Promise and direct mesh returns
        const processMesh = (mesh) => {
          if (mesh) {
            // Wrap in a pivot so the inner mesh keeps its y-offset from render3D
            const pivot = new Three.Object3D();
            pivot.name = "previewPivot";
            pivot.add(mesh);
            this.previewMesh = pivot;

            // Mark as preview so raycasting skips it
            this.previewMesh.userData.isPreview = true;
            mesh.userData.isPreview = true;
            mesh.traverse((child) => {
              child.userData.isPreview = true;
            });

            // Position pivot at current cursor if valid, otherwise at plan centre
            let initialX = 0;
            let initialZ = 0;

            if (this.currentCursor3D.valid) {
              initialX = this.currentCursor3D.x;
              initialZ = this.currentCursor3D.z;
            } else if (this.planData && this.planData.boundingBoxCenter) {
              initialX = this.planData.boundingBoxCenter.x;
              initialZ = this.planData.boundingBoxCenter.z;
            }

            // Position pivot at floor surface — inner mesh's y-offset adds altitude on top
            this.previewMesh.position.set(
              initialX,
              this.currentFloorThickness || 0,
              initialZ,
            );
            this.previewMesh.rotation.set(0, 0, 0);

            this.previewMesh.updateMatrix();
            this.previewMesh.updateMatrixWorld(true);
            this.previewItemFootprint = computeItemFootprint(this.previewMesh);

            // Add preview pivot to planData.plan (no placement indicator)
            this.planData.plan.add(this.previewMesh);
            this._markSceneDirty();
          } else {
          }
        };

        if (
          meshPromise &&
          meshPromise.then &&
          typeof meshPromise.then === "function"
        ) {
          meshPromise.then(processMesh).catch((error) => {});
        } else {
          processMesh(meshPromise);
        }
      } catch (error) {}
    }
  }

  cancelPlacement() {
    this.cleanupPreview();

    const mode = this.props.state.get("mode");
    if (mode === MODE_DRAWING_ITEM_3D) {
      // Stay in 3D view mode instead of going to IDLE
      this.context.projectActions.setMode(MODE_3D_VIEW);
    }
  }

  // End 3D item dragging and commit the new position to Redux
  _finishDrag() {
    // Remove window-level mouseup listener
    if (this._endDragOnWindowMouseUp) {
      window.removeEventListener("mouseup", this._endDragOnWindowMouseUp);
      this._endDragOnWindowMouseUp = null;
    }

    if (!this.isDragging3D) {
      return;
    }

    if (this.draggedItemMesh) {
      const finalX = this.draggedItemMesh.position.x;
      const finalZ = this.draggedItemMesh.position.z;
      const finalY = this.draggedItemMesh.position.y;
      const x2D = finalX;
      const y2D = -finalZ;

      // Clean up placement indicator
      if (this.placementIndicator && this.planData) {
        this.planData.plan.remove(this.placementIndicator);
        disposeGhostMesh(this.placementIndicator);
        this.placementIndicator = null;
        this._markSceneDirty();
      }

      // Commit final position + rotation to Redux
      this.context.itemsActions.endDraggingItem3D(x2D, y2D, 0);

      // If auto-rotation was applied, persist it
      const rotDeg = ((this.currentRotation * 180) / Math.PI) % 360;
      this.context.projectActions.setItemsAttributes(
        fromJS({ rotation: rotDeg }),
      );

      // Pin mesh to final position in case the fast-path hasn't run yet
      this.draggedItemMesh.position.set(finalX, finalY, finalZ);
    }

    // Clean up drag state synchronously
    this.isDragging3D = false;
    this.draggedItemID = null;
    this.draggedItemLayerID = null;
    this.draggedItemMesh = null;
    this.dragStartPosition = null;
    this.draggedItemFootprint = null;
    this.targetRotation = null;
    this.currentRotation = 0;
    this.snapState.reset();

    // Re-enable orbit controls
    if (this.orbitControls) {
      this.orbitControls.enabled = true;
    }
  }

  // Cancel 3D dragging - restore original position
  cancelDragging() {
    // If drag was already ended properly by _finishDrag, nothing to do
    if (!this.isDragging3D && !this.draggedItemMesh) return;

    // Remove window-level mouseup listener
    if (this._endDragOnWindowMouseUp) {
      window.removeEventListener("mouseup", this._endDragOnWindowMouseUp);
      this._endDragOnWindowMouseUp = null;
    }

    // Restore original position
    if (this.draggedItemMesh && this.dragStartPosition) {
      this.draggedItemMesh.position.set(
        this.dragStartPosition.x,
        this.dragStartPosition.y,
        this.dragStartPosition.z,
      );
      this.draggedItemMesh.rotation.y = this.dragStartPosition.rotationY;
    }

    // Clean up placement indicator
    if (this.placementIndicator && this.planData) {
      this.planData.plan.remove(this.placementIndicator);
      disposeGhostMesh(this.placementIndicator);
      this.placementIndicator = null;
      this._markSceneDirty();
    }

    // Reset dragging state
    this.isDragging3D = false;
    this.draggedItemID = null;
    this.draggedItemLayerID = null;
    this.draggedItemMesh = null;
    this.dragStartPosition = null;
    this.draggedItemFootprint = null;
    this.targetRotation = null;
    this.currentRotation = 0;
    this.snapState.reset();

    // Re-enable orbit controls
    if (this.orbitControls) {
      this.orbitControls.enabled = true;
    }
    this._markSceneDirty();

    // Switch back to 3D view mode
    this.context.projectActions.setMode(MODE_3D_VIEW);
  }

  // Clean up preview mesh and placement indicator
  cleanupPreview() {
    if (this.previewMesh && this.planData) {
      this.planData.plan.remove(this.previewMesh);
      // Dispose the preview mesh properly
      this.previewMesh.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.previewMesh = null;
      this.previewItemFootprint = null;
      this._markSceneDirty();
    }
    if (this.placementIndicator && this.planData) {
      this.planData.plan.remove(this.placementIndicator);
      disposeGhostMesh(this.placementIndicator);
      this.placementIndicator = null;
      this._markSceneDirty();
    }
    this.currentRotation = 0;
  }

  // ==================== 3D HOLE PLACEMENT METHODS ====================

  /**
   * Create a preview mesh for placing a hole (door/window) in 3D
   * Holes need to snap to walls (lines) and position along them
   */
  createPreviewForHole(holeType) {
    const catalog = this.context.catalog;
    const holeElement = catalog.getElement(holeType);

    if (holeElement && holeElement.render3D) {
      try {
        // Create a dummy element with Immutable properties
        let propertiesObj = {};
        if (holeElement.properties) {
          Object.keys(holeElement.properties).forEach((key) => {
            const prop = holeElement.properties[key];
            propertiesObj[key] = prop.defaultValue || {};
          });
        }

        const dummyElement = {
          id: "preview-hole",
          type: holeType,
          selected: false,
          properties: fromJS(propertiesObj),
        };

        const scene = this.props.state.get("scene");
        const layerID = scene.get("selectedLayer");
        const layer = scene.getIn(["layers", layerID]);

        const meshPromise = holeElement.render3D(dummyElement, layer, scene);

        const processMesh = (mesh) => {
          if (mesh) {
            // Get dimensions from the mesh to create bounding box
            const box = new Three.Box3().setFromObject(mesh);
            const size = box.getSize(new Three.Vector3());
            const boxCenter = box.getCenter(new Three.Vector3());

            // Calculate LOCAL offset from mesh origin (0,0,0) to box center
            // The mesh position is at origin, so the box center in local space is just the center
            this.holePreviewBoxOffset.set(0, size.y / 2, 0);
            this.holePreviewHalfWidth = size.x / 2;
            // Most GLB models have their origin at the bottom center, so we offset by half height

            // Store default altitude and wall thickness
            const holeElement = this.context.catalog.getElement(holeType);
            this.holeDefaultAltitude =
              holeElement?.properties?.altitude?.defaultValue?.length || 0;
            this.holeWallThickness =
              holeElement?.properties?.thickness?.defaultValue?.length || 0;
            this.holeAltitudeAdjustment = 0; // Reset adjustment

            // Create bounding box at actual item size (no padding)
            const boxGeometry = new Three.BoxGeometry(size.x, size.y, size.z);

            const edges = new Three.EdgesGeometry(boxGeometry);
            const lineMaterial = new Three.LineBasicMaterial({
              color: 0x0088ff, // Blue color
              linewidth: 3, // Thicker lines
              depthTest: false, // Render on top of everything
              transparent: true,
              opacity: 1.0, // 100% opacity
            });

            this.holePreviewBoundingBox = new Three.LineSegments(
              edges,
              lineMaterial,
            );
            this.holePreviewBoundingBox.renderOrder = 999; // Render last (on top)

            // Position the bounding box off-screen initially
            this.holePreviewBoundingBox.position.set(-10000, 0, -10000);

            if (this.planData && this.planData.plan) {
              this.planData.plan.add(this.holePreviewBoundingBox);
            }

            this._markSceneDirty();

            // Dispose the mesh since we only needed it for dimensions
            mesh.traverse((child) => {
              if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => mat.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              }
            });
          }
        };

        if (
          meshPromise &&
          meshPromise.then &&
          typeof meshPromise.then === "function"
        ) {
          meshPromise.then(processMesh).catch((error) => {});
        } else {
          processMesh(meshPromise);
        }
      } catch (error) {}
    }
  }

  /**
   * Update hole preview position based on cursor, snapping to nearest wall
   */
  updateHolePreviewPosition(x, z) {
    if (!this.holePreviewBoundingBox) return null;

    const scene = this.props.state.get("scene");
    const layerID = scene.get("selectedLayer");
    const layer = scene.getIn(["layers", layerID]);

    if (!layer) return null;

    // Convert 3D coordinates to floor plan coordinates
    const floorX = x;
    const floorY = -z;

    // Find the nearest line (wall) to snap to
    const lines = layer.get("lines");
    const vertices = layer.get("vertices");

    let nearestLine = null;
    let nearestDistance = Infinity;
    let nearestPoint = null;
    let nearestOffset = 0;

    lines.forEach((line) => {
      const v0 = vertices.get(line.vertices.get(0));
      const v1 = vertices.get(line.vertices.get(1));

      if (!v0 || !v1) return;

      // Calculate distance from point to line segment
      const dx = v1.x - v0.x;
      const dy = v1.y - v0.y;
      const lineLengthSq = dx * dx + dy * dy;

      if (lineLengthSq === 0) return;

      // Calculate projection of point onto line
      let t = ((floorX - v0.x) * dx + (floorY - v0.y) * dy) / lineLengthSq;
      t = Math.max(0, Math.min(1, t)); // Clamp to segment

      const projX = v0.x + t * dx;
      const projY = v0.y + t * dy;

      const dist = Math.sqrt((floorX - projX) ** 2 + (floorY - projY) ** 2);

      // Increased snap distance for better detection (200 units)
      if (dist < nearestDistance && dist < 200) {
        nearestDistance = dist;
        nearestLine = line;
        nearestPoint = { x: projX, y: projY };
        nearestOffset = t;
      }
    });

    if (nearestLine && nearestPoint) {
      this.holePlacementLine = nearestLine;
      this.holePlacementOffset = nearestOffset;

      // Get line vertices for angle calculation
      const v0 = vertices.get(nearestLine.vertices.get(0));
      const v1 = vertices.get(nearestLine.vertices.get(1));

      // Calculate wall angle
      const dx = v1.x - v0.x;
      const dy = v1.y - v0.y;
      const lineLength = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.asin(dy / lineLength);

      // Calculate final altitude (default + manual adjustment)
      const finalAltitude =
        this.holeDefaultAltitude + this.holeAltitudeAdjustment;

      // Clamp using the hole width from its center so doors/windows place from their midpoint.
      const boxHalfWidth = this.holePreviewHalfWidth || 0;

      // Clamp offset to keep box within wall boundaries
      // Leave some margin at the edges (boxHalfWidth on each side)
      const minOffset = boxHalfWidth / lineLength;
      const maxOffset = 1 - boxHalfWidth / lineLength;
      const clampedOffset = Math.max(
        minOffset,
        Math.min(maxOffset, nearestOffset),
      );

      // Recalculate position with clamped offset
      const clampedX = v0.x + clampedOffset * dx;
      const clampedY = v0.y + clampedOffset * dy;

      // Update stored offset to the clamped value
      this.holePlacementOffset = clampedOffset;

      // Position the bounding box at the clamped position (centered on wall)
      // Only apply the Y offset (half height) directly, don't rotate it
      this.holePreviewBoundingBox.position.x = clampedX;
      this.holePreviewBoundingBox.position.y =
        finalAltitude + this.holePreviewBoxOffset.y;
      this.holePreviewBoundingBox.position.z = -clampedY;
      this.holePreviewBoundingBox.rotation.y = alpha;
      this._markSceneDirty();

      return {
        lineID: nearestLine.id,
        offset: clampedOffset,
        position: { x: clampedX, y: clampedY },
      };
    } else {
      // No wall nearby - hide bounding box
      this.holePreviewBoundingBox.position.set(-10000, 0, -10000);
      this.holePlacementLine = null;
      this._markSceneDirty();
      return null;
    }
  }

  /**
   * Cancel hole placement and clean up
   */
  cancelHolePlacement() {
    // Clean up bounding box
    if (this.holePreviewBoundingBox && this.planData) {
      this.planData.plan.remove(this.holePreviewBoundingBox);
      if (this.holePreviewBoundingBox.geometry) {
        this.holePreviewBoundingBox.geometry.dispose();
      }
      if (this.holePreviewBoundingBox.material) {
        this.holePreviewBoundingBox.material.dispose();
      }
      this.holePreviewBoundingBox = null;
      this.holePreviewHalfWidth = 0;
      this._markSceneDirty();
    }

    this.holePlacementLine = null;
    this.holePlacementOffset = 0;
    this.holeAltitudeAdjustment = 0;
    this.holeDefaultAltitude = 0;
    this.holeWallThickness = 0;

    const mode = this.props.state.get("mode");
    if (mode === MODE_DRAWING_HOLE_3D) {
      this.context.projectActions.setMode(MODE_3D_VIEW);
    }
  }

  /**
   * Cancel hole dragging
   */
  cancelHoleDragging() {
    this.isDraggingHole3D = false;
    this.draggedHoleID = null;
    this.draggedHoleLayerID = null;

    if (this.orbitControls) {
      this.orbitControls.enabled = true;
    }

    this.context.projectActions.setMode(MODE_3D_VIEW);
  }

  /**
   * Handle view settings changes from the panel
   */
  handleViewSettingsChange(newSettings) {
    this.viewSettings = newSettings;
    this.applyViewSettings(newSettings);
    this.setGestureZoomEnabled(newSettings.gestureZoom);
    this.syncGesturePreview();
    this._markSceneDirty();
  }

  /**
   * Apply view settings to scene elements
   */
  applyViewSettings(settings) {
    if (!this.planData) return;

    // Update wall visibility manager settings
    wallVisibilityManager.setEnabled(settings.autoHideWalls);
    wallVisibilityManager.setViewSetting("walls", settings.walls);
    wallVisibilityManager.setViewSetting("furniture", settings.furniture);
    wallVisibilityManager.setViewSetting("grid", settings.grid);
    wallVisibilityManager.setViewSetting("doors", settings.doors);
    wallVisibilityManager.setViewSetting("windows", settings.windows);

    // Handle grid visibility directly
    if (this.planData.grid) {
      this.planData.grid.visible = settings.grid;
    }

    // Handle axis helper visibility
    if (this.scene3D) {
      this.scene3D.traverse((obj) => {
        if (obj.type === "AxesHelper") {
          obj.visible = settings.helpers;
        }
      });
    }

    // Handle items visibility per layer
    const layers = this.planData.sceneGraph?.layers;
    if (layers) {
      Object.values(layers).forEach((layer) => {
        // Toggle furniture/items
        if (layer.items) {
          Object.values(layer.items).forEach((item) => {
            if (item) item.visible = settings.furniture;
          });
        }

        // Toggle holes (doors and windows) using userData for reliable detection
        if (layer.holes) {
          Object.entries(layer.holes).forEach(([holeID, hole]) => {
            if (!hole) return;
            const ct = (
              hole.userData?.catalogType ||
              hole.name ||
              ""
            ).toLowerCase();
            if (ct.includes("door")) {
              hole.visible = settings.doors;
            } else if (ct.includes("window")) {
              hole.visible = settings.windows;
            } else {
              hole.visible = settings.doors && settings.windows;
            }
          });
        }
      });
    }

    // Handle ceiling visibility via area states
    wallVisibilityManager.areaStates.forEach((aState) => {
      const mesh = aState.mesh;
      if (!mesh) return;
      const ceiling = mesh.getObjectByName("ceiling");
      if (ceiling) {
        // If auto-hide is off, respect the explicit setting
        if (!settings.autoHideWalls) {
          const vis = settings.walls; // ceiling follows wall visibility
          ceiling.visible = vis;
          aState.ceilingOpacity = vis ? 1.0 : 0.0;
        }
      }
    });
  }

  render() {
    const { gestureUi } = this.state;
    const showGestureBadge = this.viewSettings?.gestureZoom || gestureUi.error;
    const showGesturePreview =
      this.viewSettings?.gestureZoom && this.viewSettings?.gestureCameraPreview;

    return React.createElement(
      "div",
      {
        ref: this.canvasWrapperRef,
        style: { position: "relative", width: "100%", height: "100%" },
      },
      showGestureBadge
        ? React.createElement(
            "div",
            {
              style: {
                position: "absolute",
                top: "16px",
                right: "332px",
                zIndex: 6,
                padding: "10px 14px",
                borderRadius: "12px",
                background: "rgba(8, 17, 31, 0.82)",
                color: "#ffffff",
                fontSize: "12px",
                lineHeight: 1.4,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
                pointerEvents: "none",
              },
            },
            gestureUi.error
              ? `Hand gestures error: ${gestureUi.error}`
              : gestureUi.ready
                ? "Hand gestures active: use one pinched hand to rotate, and two hands to zoom."
                : "Starting hand gestures... allow camera access.",
            gestureUi.debug
              ? React.createElement(
                  "div",
                  {
                    style: {
                      marginTop: "6px",
                      opacity: 0.82,
                      fontSize: "11px",
                    },
                  },
                  gestureUi.debug,
                )
              : null,
          )
        : null,
      showGesturePreview
        ? React.createElement("div", {
            ref: this.gesturePreviewRef,
            style: {
              position: "absolute",
              top: "64px",
              right: "332px",
              width: "220px",
              aspectRatio: "4 / 3",
              zIndex: 5,
              overflow: "hidden",
              borderRadius: "14px",
              background: "rgba(8, 17, 31, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            },
          })
        : null,
    );
  }
}

Scene3DViewer.propTypes = {
  state: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  isActive: PropTypes.bool,
};

Scene3DViewer.contextType = PlannerContext;
