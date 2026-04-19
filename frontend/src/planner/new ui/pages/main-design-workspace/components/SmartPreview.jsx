import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as Three from 'three';
import { OrbitControls } from 'three-stdlib';
import './SmartPreview.css';

const PX_RATIO = typeof window !== 'undefined'
  ? Math.min(window.devicePixelRatio || 1, 1.5)
  : 1;
const PREVIEW_W = 300;
const PREVIEW_H = 200;
const TOP_DOWN_FRUSTUM = 800;
const CAMERA_ICON = '/assets/Camera.png';
const TARGET_ICON = '/assets/position.png';

const getPreviewSize = (container) => ({
  width: Math.max(container?.clientWidth || PREVIEW_W, 160),
  height: Math.max(container?.clientHeight || PREVIEW_H, 120),
});

const getLiveViewerReferences = () => {
  const viewer = window.__viewer3D;
  const snapshot = window.__viewer3DSnapshot;

  return {
    viewer,
    snapshot,
    mainScene: viewer?.scene3D || snapshot?.scene3D || null,
    planData: viewer?.planData || snapshot?.planData || null,
  };
};

const getViewerFloorLevel = (viewer) => {
  const floorLevel = viewer?.getRenderFloorLevel?.();
  return Number.isFinite(floorLevel) ? floorLevel : 0;
};

const getViewerPose = (viewer) => {
  if (!viewer) return null;

  if (typeof viewer.getRenderPreviewState === 'function') {
    return viewer.getRenderPreviewState();
  }

  if (viewer.camera && viewer.orbitControls) {
    return {
      position: viewer.camera.position.clone(),
      target: viewer.orbitControls.target.clone(),
    };
  }

  return null;
};

const setViewerPose = (viewer, nextPose) => {
  if (!viewer || !nextPose) return;

  if (typeof viewer.setRenderPreviewState === 'function') {
    viewer.setRenderPreviewState(nextPose);
    return;
  }

  if (nextPose.position && viewer.camera) {
    viewer.camera.position.x = nextPose.position.x;
    viewer.camera.position.z = nextPose.position.z;
  }

  if (nextPose.target && viewer.orbitControls) {
    viewer.orbitControls.target.x = nextPose.target.x;
    viewer.orbitControls.target.z = nextPose.target.z;
    viewer.orbitControls.update?.();
  }

  // Scene3DViewer uses a demand-driven render loop, so explicitly wake it
  // when pose is updated from the Smart Viewer drag interactions.
  if (typeof viewer._markSceneDirty === 'function') {
    viewer._markSceneDirty();
  } else if (typeof viewer._ensureRenderLoop === 'function') {
    viewer._sceneDirtyForFrame = true;
    viewer._ensureRenderLoop();
  }
};

function PlanView2D({ label }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const initialSize = getPreviewSize(container);
    let viewportWidth = initialSize.width;
    let viewportHeight = initialSize.height;

    const renderer = new Three.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(viewportWidth, viewportHeight);
    renderer.setPixelRatio(PX_RATIO);
    renderer.outputColorSpace = Three.SRGBColorSpace;
    renderer.setClearColor(0xf7f8fa, 1);
    container.appendChild(renderer.domElement);

    const aspect = viewportWidth / viewportHeight;
    const topCamera = new Three.OrthographicCamera(
      -TOP_DOWN_FRUSTUM * aspect,
      TOP_DOWN_FRUSTUM * aspect,
      TOP_DOWN_FRUSTUM,
      -TOP_DOWN_FRUSTUM,
      1,
      100000
    );
    topCamera.position.set(0, 5000, 0);
    topCamera.up.set(0, 0, -1);
    topCamera.lookAt(0, 0, 0);

    const controls = new OrbitControls(topCamera, renderer.domElement);
    controls.enableRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = true;
    controls.mouseButtons = {
      LEFT: Three.MOUSE.PAN,
      MIDDLE: Three.MOUSE.DOLLY,
      RIGHT: Three.MOUSE.PAN,
    };

    const overlayScene = new Three.Scene();
    const textureLoader = new Three.TextureLoader();

    const cameraSprite = new Three.Sprite(
      new Three.SpriteMaterial({ map: textureLoader.load(CAMERA_ICON), depthTest: false, sizeAttenuation: true })
    );
    cameraSprite.renderOrder = 1000;
    overlayScene.add(cameraSprite);

    const targetSprite = new Three.Sprite(
      new Three.SpriteMaterial({ map: textureLoader.load(TARGET_ICON), depthTest: false, sizeAttenuation: true })
    );
    targetSprite.renderOrder = 1000;
    overlayScene.add(targetSprite);

    const lineMaterial = new Three.LineDashedMaterial({
      color: 0x141414,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
      dashSize: 160,
      gapSize: 80,
    });
    const lineGeometry = new Three.BufferGeometry().setFromPoints([new Three.Vector3(), new Three.Vector3()]);
    const dashedLine = new Three.Line(lineGeometry, lineMaterial);
    dashedLine.frustumCulled = false;
    dashedLine.renderOrder = 999;
    overlayScene.add(dashedLine);

    const raycaster = new Three.Raycaster();
    const mouse = new Three.Vector2();
    const directionVector = new Three.Vector3();

    const scaleForPixels = (pixels) => pixels * (TOP_DOWN_FRUSTUM * 2) / (viewportHeight * topCamera.zoom);

    const handleResize = () => {
      const nextSize = getPreviewSize(container);
      viewportWidth = nextSize.width;
      viewportHeight = nextSize.height;

      const nextAspect = viewportWidth / viewportHeight;
      topCamera.left = -TOP_DOWN_FRUSTUM * nextAspect;
      topCamera.right = TOP_DOWN_FRUSTUM * nextAspect;
      topCamera.top = TOP_DOWN_FRUSTUM;
      topCamera.bottom = -TOP_DOWN_FRUSTUM;
      topCamera.updateProjectionMatrix();
      renderer.setSize(viewportWidth, viewportHeight);
    };

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    const getWorldPoint = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const { viewer } = getLiveViewerReferences();
      const floorLevel = getViewerFloorLevel(viewer);
      const groundPlane = new Three.Plane(new Three.Vector3(0, 1, 0), -floorLevel);

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, topCamera);

      const point = new Three.Vector3();
      raycaster.ray.intersectPlane(groundPlane, point);
      return point;
    };

    const onMouseDown = (event) => {
      if (event.button !== 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, topCamera);

      const hits = raycaster.intersectObjects([cameraSprite, targetSprite]);
      if (!hits.length) return;

      dragRef.current = hits[0].object === cameraSprite ? 'camera' : 'target';
      controls.enabled = false;
      event.stopPropagation();
    };

    const onMouseMove = (event) => {
      if (!dragRef.current) return;

      const { viewer } = getLiveViewerReferences();
      if (!viewer) return;

      const point = getWorldPoint(event);
      if (dragRef.current === 'camera') {
        setViewerPose(viewer, { position: { x: point.x, z: point.z } });
      } else {
        setViewerPose(viewer, { target: { x: point.x, z: point.z } });
      }
    };

    const onMouseUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      controls.enabled = true;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let animationFrameId;
    let mainScene = null;
    let centered = false;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);

      const { viewer, mainScene: liveScene, planData } = getLiveViewerReferences();
      if (!mainScene && liveScene) {
        mainScene = liveScene;
      }

      if (!centered && planData?.boundingBoxCenter?.lenX > 0) {
        const { boundingBoxCenter } = planData;
        const floorLevel = getViewerFloorLevel(viewer);
        controls.target.set(boundingBoxCenter.x, floorLevel, boundingBoxCenter.z);
        topCamera.position.set(boundingBoxCenter.x, floorLevel + 5000, boundingBoxCenter.z);
        topCamera.updateProjectionMatrix();
        centered = true;
      }

      const pose = getViewerPose(viewer);
      if (pose?.position && pose?.target) {
        const floorLevel = getViewerFloorLevel(viewer);
        const lineY = floorLevel + 1;
        const cameraScale = scaleForPixels(30);
        const targetScale = scaleForPixels(20);

        cameraSprite.position.set(pose.position.x, lineY, pose.position.z);
        targetSprite.position.set(pose.target.x, lineY, pose.target.z);
        cameraSprite.scale.set(cameraScale, cameraScale, 1);
        targetSprite.scale.set(targetScale, targetScale, 1);

        directionVector.subVectors(pose.target, pose.position);
        if (directionVector.lengthSq() > 1e-6) {
          cameraSprite.material.rotation = -Math.atan2(-directionVector.x, directionVector.z) - Math.PI / 2;
        }

        lineMaterial.dashSize = scaleForPixels(5);
        lineMaterial.gapSize = scaleForPixels(3);
        lineMaterial.needsUpdate = true;

        const positions = dashedLine.geometry.attributes.position;
        positions.setXYZ(0, pose.position.x, lineY, pose.position.z);
        positions.setXYZ(1, pose.target.x, lineY, pose.target.z);
        positions.needsUpdate = true;
        dashedLine.computeLineDistances();
      }

      controls.update();
      renderer.autoClear = true;
      if (mainScene) {
        renderer.render(mainScene, topCamera);
      } else {
        renderer.clear();
      }
      renderer.autoClear = false;
      renderer.render(overlayScene, topCamera);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      controls.dispose();
      renderer.dispose();
      cameraSprite.material.dispose();
      targetSprite.material.dispose();
      lineMaterial.dispose();
      lineGeometry.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="smart-preview" ref={containerRef}>
      <div className="preview-label">{label}</div>
    </div>
  );
}

function MiniPreview3DView({ label }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const initialSize = getPreviewSize(container);
    let viewportWidth = initialSize.width;
    let viewportHeight = initialSize.height;

    const renderer = new Three.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(viewportWidth, viewportHeight);
    renderer.setPixelRatio(PX_RATIO);
    renderer.outputColorSpace = Three.SRGBColorSpace;
    renderer.setClearColor(0xe8ecf0, 1);
    container.appendChild(renderer.domElement);

    const aspect = viewportWidth / viewportHeight;
    const camera = new Three.OrthographicCamera(
      -TOP_DOWN_FRUSTUM * aspect,
      TOP_DOWN_FRUSTUM * aspect,
      TOP_DOWN_FRUSTUM,
      -TOP_DOWN_FRUSTUM,
      1,
      100000
    );
    camera.position.set(0, 500, 0);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.mouseButtons = {
      LEFT: Three.MOUSE.ROTATE,
      MIDDLE: Three.MOUSE.DOLLY,
      RIGHT: Three.MOUSE.PAN,
    };

    const fallbackScene = new Three.Scene();
    fallbackScene.add(new Three.AmbientLight(0xffffff, 0.8));

    const handleResize = () => {
      const nextSize = getPreviewSize(container);
      viewportWidth = nextSize.width;
      viewportHeight = nextSize.height;

      const nextAspect = viewportWidth / viewportHeight;
      camera.left = -TOP_DOWN_FRUSTUM * nextAspect;
      camera.right = TOP_DOWN_FRUSTUM * nextAspect;
      camera.top = TOP_DOWN_FRUSTUM;
      camera.bottom = -TOP_DOWN_FRUSTUM;
      camera.updateProjectionMatrix();
      renderer.setSize(viewportWidth, viewportHeight);
    };

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    let animationFrameId;
    let mainScene = null;
    let centered = false;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);

      const { mainScene: liveScene, planData } = getLiveViewerReferences();
      if (!mainScene && liveScene) {
        mainScene = liveScene;
      }

      if (!centered && planData?.boundingBoxCenter?.lenX > 0) {
        const { boundingBoxCenter } = planData;
        controls.target.set(boundingBoxCenter.x, boundingBoxCenter.y, boundingBoxCenter.z);
        camera.position.set(boundingBoxCenter.x - boundingBoxCenter.lenX, 500, boundingBoxCenter.z + boundingBoxCenter.lenZ);
        camera.updateProjectionMatrix();
        centered = true;
      }

      controls.update();
      renderer.render(mainScene || fallbackScene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="smart-preview" ref={containerRef}>
      <div className="preview-label">{label}</div>
    </div>
  );
}

function FirstPersonPreview({ label }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const initialSize = getPreviewSize(container);
    let viewportWidth = initialSize.width;
    let viewportHeight = initialSize.height;

    const renderer = new Three.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(viewportWidth, viewportHeight);
    renderer.setPixelRatio(PX_RATIO);
    renderer.outputColorSpace = Three.SRGBColorSpace;
    renderer.setClearColor(0x101722, 1);
    container.appendChild(renderer.domElement);

    const camera = new Three.PerspectiveCamera(45, viewportWidth / viewportHeight, 0.1, 300000);
    const fallbackScene = new Three.Scene();
    fallbackScene.add(new Three.AmbientLight(0xffffff, 0.9));

    const handleResize = () => {
      const nextSize = getPreviewSize(container);
      viewportWidth = nextSize.width;
      viewportHeight = nextSize.height;

      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(viewportWidth, viewportHeight);
    };

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    const fallbackTarget = new Three.Vector3();
    let animationFrameId;
    let mainScene = null;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);

      const { viewer, mainScene: liveScene, planData } = getLiveViewerReferences();
      if (!mainScene && liveScene) {
        mainScene = liveScene;
      }

      if (viewer?.camera) {
        viewer.camera.getWorldPosition(camera.position);
        viewer.camera.getWorldQuaternion(camera.quaternion);
        if (viewer.camera.fov) {
          camera.fov = viewer.camera.fov;
          camera.updateProjectionMatrix();
        }
      } else if (planData?.boundingBoxCenter?.lenX > 0) {
        const { boundingBoxCenter } = planData;
        fallbackTarget.set(boundingBoxCenter.x, boundingBoxCenter.y, boundingBoxCenter.z);
        camera.position.set(boundingBoxCenter.x - 300, 220, boundingBoxCenter.z + 300);
        camera.lookAt(fallbackTarget);
      }

      renderer.render(mainScene || fallbackScene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="smart-preview" ref={containerRef}>
      <div className="preview-label">{label}</div>
    </div>
  );
}

function RenderSmartPreview() {
  const [previewMode, setPreviewMode] = useState('2d');

  return (
    <div className="smart-preview-shell render-variant">
      <div className="smart-preview-toolbar">
        <span className="smart-preview-toolbar-label">Live View</span>
        <div className="smart-preview-toggle" role="tablist" aria-label="Render smart preview mode">
          <button
            type="button"
            className={`smart-preview-toggle-btn ${previewMode === '2d' ? 'active' : ''}`}
            onClick={() => setPreviewMode('2d')}
          >
            2D
          </button>
          <button
            type="button"
            className={`smart-preview-toggle-btn ${previewMode === 'first-person' ? 'active' : ''}`}
            onClick={() => setPreviewMode('first-person')}
          >
            First Person
          </button>
        </div>
      </div>

      <div className="smart-preview-stage">
        {previewMode === '2d'
          ? <PlanView2D label="2D Plan" />
          : <FirstPersonPreview label="First Person" />}
      </div>
    </div>
  );
}

export default function SmartPreview({ workspaceMode = '2d', variant = 'default' }) {
  if (variant === 'render') {
    return <RenderSmartPreview />;
  }

  const is3D = workspaceMode === '3d' || workspaceMode === '3d-firstperson';
  return is3D ? <PlanView2D label="2D Plan" /> : <MiniPreview3DView label="3D Preview" />;
}

PlanView2D.propTypes = {
  label: PropTypes.string.isRequired,
};

MiniPreview3DView.propTypes = {
  label: PropTypes.string.isRequired,
};

FirstPersonPreview.propTypes = {
  label: PropTypes.string.isRequired,
};

SmartPreview.propTypes = {
  workspaceMode: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'render']),
};
