import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as Three from 'three';
import { OrbitControls } from 'three-stdlib';
import './SmartPreview.css';

/* ───────────────────────────────────────────────────────
   SmartPreview — Coohom-style adaptive preview panel
   • Main view 3D → real top-down 2D plan via dedicated
     orthographic camera + draggable PNG camera/target icons
   • Main view 2D → mini 3D bird-eye preview
   ─────────────────────────────────────────────────────── */

const PX_RATIO = Math.min(window.devicePixelRatio, 1.5);
const PREVIEW_W = 300;
const PREVIEW_H = 200;
const CAM_ICON = '/assets/Camera.png';
const TGT_ICON = '/assets/position.png';

/* ══════════════════════════════════════════════════════
   SUB-COMPONENT A: 2D Plan View (shown when main = 3D)
   Renders the ACTUAL scene from a dedicated top-down
   orthographic camera + draggable camera/target PNG sprites.
   ══════════════════════════════════════════════════════ */

function PlanView2D() {
  const containerRef = useRef(null);
  const dragRef = useRef(null); // 'camera' | 'target' | null

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ---- Renderer ----
    const renderer = new Three.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(PREVIEW_W, PREVIEW_H);
    renderer.setPixelRatio(PX_RATIO);
    renderer.outputColorSpace = Three.SRGBColorSpace;
    renderer.setClearColor(0xf7f8fa, 1);
    container.appendChild(renderer.domElement);

    // ---- Dedicated top-down orthographic camera ----
    const aspect = PREVIEW_W / PREVIEW_H;
    const frustum = 800;
    const topCam = new Three.OrthographicCamera(
      -frustum * aspect, frustum * aspect, frustum, -frustum, 1, 100000
    );
    topCam.position.set(0, 5000, 0);
    topCam.up.set(0, 0, -1);
    topCam.lookAt(0, 0, 0);

    // ---- Controls (pan + zoom only, no rotation) ----
    const controls = new OrbitControls(topCam, renderer.domElement);
    controls.enableRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = true;
    controls.mouseButtons = { LEFT: Three.MOUSE.PAN, MIDDLE: Three.MOUSE.DOLLY, RIGHT: Three.MOUSE.PAN };

    // ---- Overlay scene for sprites ----
    const overlayScene = new Three.Scene();
    const texLoader = new Three.TextureLoader();

    const camSprite = new Three.Sprite(
      new Three.SpriteMaterial({ map: texLoader.load(CAM_ICON), depthTest: false, sizeAttenuation: true })
    );
    camSprite.renderOrder = 1000;
    camSprite.scale.set(80, 80, 1);
    overlayScene.add(camSprite);

    const tgtSprite = new Three.Sprite(
      new Three.SpriteMaterial({ map: texLoader.load(TGT_ICON), depthTest: false, sizeAttenuation: true })
    );
    tgtSprite.renderOrder = 1000;
    tgtSprite.scale.set(80, 80, 1);
    overlayScene.add(tgtSprite);

    // Line between camera and target
    const lineMat = new Three.LineDashedMaterial({
      color: 0x141414, transparent: true, opacity: 0.85,
      depthTest: false, depthWrite: false,
      dashSize: 160, gapSize: 80,
    });
    const lineGeom = new Three.BufferGeometry().setFromPoints([new Three.Vector3(), new Three.Vector3()]);
    const dashLine = new Three.Line(lineGeom, lineMat);
    // CRITICAL: geometry starts at (0,0,0) so its bounding sphere is radius-0 at origin.
    // When the camera pans to the room center the frustum check culls this line.
    // Disable culling so it always draws regardless of camera position.
    dashLine.frustumCulled = false;
    dashLine.renderOrder = 999;
    overlayScene.add(dashLine);

    // --- Constant-pixel-size scaling helper ---
    // For an OrthographicCamera with half-height `frustum`:
    //   world_units_per_pixel = (frustum * 2) / (PREVIEW_H * camera.zoom)
    // So to keep a sprite at ICON_PX screen pixels:
    //   scale_world = ICON_PX * (frustum * 2) / (PREVIEW_H * camera.zoom)
    const ICON_PX_CAM = 30;  // camera icon screen size in pixels
    const ICON_PX_TGT = 20;  // target icon screen size in pixels
    const DASH_PX = 5;      // dash length in pixels
    const GAP_PX = 3;       // gap length in pixels
    const scaleForPx = (px) => px * (frustum * 2) / (PREVIEW_H * topCam.zoom);

    // ---- Raycaster for drag-picking ----
    const raycaster = new Three.Raycaster();
    const mouse = new Three.Vector2();
    const groundPlane = new Three.Plane(new Three.Vector3(0, 1, 0), 0);

    const worldFromEvent = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, topCam);
      const pt = new Three.Vector3();
      raycaster.ray.intersectPlane(groundPlane, pt);
      return pt;
    };

    const onDown = (e) => {
      if (e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, topCam);
      const hits = raycaster.intersectObjects([camSprite, tgtSprite]);
      if (hits.length) {
        dragRef.current = hits[0].object === camSprite ? 'camera' : 'target';
        controls.enabled = false;
        e.stopPropagation();
      }
    };
    const onMove = (e) => {
      if (!dragRef.current) return;
      const pt = worldFromEvent(e);
      const v = window.__viewer3D;
      if (!v) return;
      if (dragRef.current === 'camera' && v.camera) { v.camera.position.x = pt.x; v.camera.position.z = pt.z; }
      if (dragRef.current === 'target' && v.orbitControls) { v.orbitControls.target.x = pt.x; v.orbitControls.target.z = pt.z; }
    };
    const onUp = () => { if (dragRef.current) { dragRef.current = null; controls.enabled = true; } };

    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // ---- Main scene ref ----
    let mainScene = null;
    let centred = false;

    // ---- Tick ----
    let animId;
    const tick = () => {
      animId = requestAnimationFrame(tick);
      const v = window.__viewer3D;
      const snap = window.__viewer3DSnapshot;
      if (!mainScene) {
        if (v && v.scene3D) mainScene = v.scene3D;
        else if (snap && snap.scene3D) mainScene = snap.scene3D;
      }
      if (!centred) {
        const pd = (v && v.planData) || (snap && snap.planData);
        // Wait until updateBoundingBox has run — it sets lenX after the async geometry load.
        // boundingBoxCenter starts as Vector3(0,0,0) so the plain truthiness check fires too early.
        if (pd && pd.boundingBoxCenter && pd.boundingBoxCenter.lenX > 0) {
          const bc = pd.boundingBoxCenter;
          controls.target.set(bc.x, 0, bc.z);
          topCam.position.set(bc.x, 5000, bc.z);
          topCam.updateProjectionMatrix();
          centred = true;
        }
      }
      if (v && v.camera && v.orbitControls) {
        const mc = v.camera.position, mt = v.orbitControls.target;
        camSprite.position.set(mc.x, 1, mc.z);
        tgtSprite.position.set(mt.x, 1, mt.z);
        const dir = new Three.Vector3().subVectors(mt, mc);
        camSprite.material.rotation = -Math.atan2(-dir.x, dir.z) - Math.PI/2;

        // Scale icons so they stay a fixed pixel size as user pans/zooms
        const cs = scaleForPx(ICON_PX_CAM);
        const ts = scaleForPx(ICON_PX_TGT);
        camSprite.scale.set(cs, cs, 1);
        tgtSprite.scale.set(ts, ts, 1);

        // Scale dash/gap to keep constant pixel appearance
        lineMat.dashSize = scaleForPx(DASH_PX);
        lineMat.gapSize  = scaleForPx(GAP_PX);
        lineMat.needsUpdate = true;

        const lp = dashLine.geometry.attributes.position;
        lp.setXYZ(0, mc.x, 1, mc.z); lp.setXYZ(1, mt.x, 1, mt.z);
        lp.needsUpdate = true;
        // Required for LineDashedMaterial to compute line distances for dash rendering
        dashLine.computeLineDistances();
      }
      controls.update();
      // Always render: clear once, draw main scene (or blank), then sprites overlay.
      renderer.autoClear = true;
      if (mainScene) {
        renderer.render(mainScene, topCam);
      } else {
        renderer.clear();
      }
      renderer.autoClear = false;
      renderer.render(overlayScene, topCam);
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      controls.dispose(); renderer.dispose();
      camSprite.material.dispose(); tgtSprite.material.dispose();
      lineMat.dispose(); lineGeom.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="smart-preview" ref={containerRef}>
      <div className="preview-label">2D Plan</div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   SUB-COMPONENT B: 3D Mini Preview (shown when main = 2D)
   Renders the main scene from a bird-eye orthographic camera.
   Uses the SAME scene objects (no cloning).
   ══════════════════════════════════════════════════════ */

function MiniPreview3DView() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Three.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(PREVIEW_W, PREVIEW_H);
    renderer.setPixelRatio(PX_RATIO);
    renderer.outputColorSpace = Three.SRGBColorSpace;
    renderer.setClearColor(0xe8ecf0, 1);
    container.appendChild(renderer.domElement);

    // Orthographic bird-eye camera
    const aspect = PREVIEW_W / PREVIEW_H;
    const frustum = 800;
    const camera = new Three.OrthographicCamera(
      -frustum * aspect, frustum * aspect, frustum, -frustum, 1, 100000
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

    // Use the live viewer scene if available (__viewer3D is always mounted),
    // with a snapshot fallback for edge cases (e.g. first-person mode).
    let mainScene = null;
    let centred = false;

    // Fallback scene (shown before 3D viewer loads)
    const fallback = new Three.Scene();
    fallback.add(new Three.AmbientLight(0xffffff, 0.8));

    let animId;
    const tick = () => {
      animId = requestAnimationFrame(tick);
      const v = window.__viewer3D;
      const snap = window.__viewer3DSnapshot;
      if (!mainScene) {
        if (v && v.scene3D) mainScene = v.scene3D;
        else if (snap && snap.scene3D) mainScene = snap.scene3D;
      }
      if (!centred) {
        const pd = (v && v.planData) || (snap && snap.planData);
        if (pd && pd.boundingBoxCenter && pd.boundingBoxCenter.lenX > 0) {
          const bc = pd.boundingBoxCenter;
          controls.target.set(bc.x, bc.y, bc.z);
          camera.position.set(bc.x - bc.lenX, 500, bc.z + bc.lenZ);
          camera.updateProjectionMatrix();
          centred = true;
        }
      }
      controls.update();
      renderer.render(mainScene || fallback, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="smart-preview" ref={containerRef}>
      <div className="preview-label">3D Preview</div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   MAIN EXPORT — SmartPreview
   ══════════════════════════════════════════════════════ */

export default function SmartPreview({ workspaceMode }) {
  const is3D = workspaceMode === '3d' || workspaceMode === '3d-firstperson';
  return is3D ? <PlanView2D /> : <MiniPreview3DView />;
}

SmartPreview.propTypes = {
  workspaceMode: PropTypes.string,
};
