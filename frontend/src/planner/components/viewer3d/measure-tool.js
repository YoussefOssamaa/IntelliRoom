/**
 * 3D Measure Tool — two-click point-to-point measurement with strong snapping.
 *
 * Snap priority (highest → lowest):
 *   1. Wall corners (inner / outer, post-thickness vertices)
 *   2. Opening (door / window) edges
 *   3. Wall edges (project onto nearest wall segment centre-line or face)
 *   4. Grid fallback (10 cm)
 *
 * Rendering:
 *   - Thin neutral-grey line (depthTest off, always visible)
 *   - White rounded billboard label with dark text (distance in mm)
 *   - Live update during drag (rubber-band preview)
 *
 * Usage (viewer3d.js):
 *   this.measureTool = new MeasureTool(scene3D, camera, renderer);
 *   measureTool.onMouseMove(mouse, planData.plan, sceneState);
 *   measureTool.onClick();
 *   measureTool.cancel();
 *   measureTool.dispose();
 */

import * as Three from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────

const SNAP_RADIUS       = 30;   // scene-units — vertex / corner snap
const EDGE_SNAP_RADIUS  = 20;   // scene-units — edge projection snap
const GRID_SNAP_SIZE    = 10;   // scene-units — grid fallback

const LINE_COLOR        = 0x000000;   // neutral slate-400
const SNAP_COLOR        = 0xf97316;   // orange snap marker
const SNAP_CORNER_COLOR = 0x22c55e;   // green when snapped to corner
const MARKER_RADIUS     = 4;

// ─── Reusable objects ─────────────────────────────────────────────────────────

const _ray   = new Three.Raycaster();
const _plane = new Three.Plane(new Three.Vector3(0, 1, 0), 0); // ground plane

// ─── Label sprite builder ─────────────────────────────────────────────────────

function createLabel(text) {
  const dpr     = Math.min(window.devicePixelRatio || 1, 2);
  const fontSize = 26 * dpr;
  const padH     = 12 * dpr;
  const padV     = 8 * dpr;

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');

  ctx.font = `600 ${fontSize}px "Inter","Segoe UI",sans-serif`;
  const tw   = ctx.measureText(text).width;
  canvas.width  = Math.ceil(tw + padH * 2);
  canvas.height = Math.ceil(fontSize + padV * 2);
  const w = canvas.width, h = canvas.height;

  // Rounded white rect
  const r = 6 * dpr;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r); ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h); ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r); ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth   = 1.5 * dpr;
  ctx.stroke();

  // Dark text
  ctx.fillStyle    = '#000000';
  ctx.font         = `600 ${fontSize}px "Inter","Segoe UI",sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'center';
  ctx.fillText(text, w / 2, h / 2);

  const tex = new Three.CanvasTexture(canvas);
  tex.needsUpdate = true;

  const mat = new Three.SpriteMaterial({
    map: tex,
    depthTest: false,
    transparent: true,
    sizeAttenuation: true,
  });

  const sprite = new Three.Sprite(mat);
  const aspect = w / h;
  const labelH = 10;
  sprite.scale.set(labelH * aspect, labelH, 1);
  sprite.renderOrder = 10001;
  return sprite;
}

// ─── Measurement guide builder ────────────────────────────────────────────────

function buildMeasureLine(p1, p2) {
  const geom = new Three.BufferGeometry().setFromPoints([p1, p2]);
  const mat  = new Three.LineBasicMaterial({
    color: LINE_COLOR, depthTest: false, transparent: true, opacity: 0.85, linewidth: 1,
  });
  const line = new Three.Line(geom, mat);
  line.renderOrder = 10000;
  return line;
}

function buildTicks(p1, p2, size) {
  const dir  = new Three.Vector3().subVectors(p2, p1).normalize();
  const perp = new Three.Vector3(-dir.z, 0, dir.x);
  if (perp.lengthSq() < 0.001) perp.set(0, 1, 0);
  const half = perp.clone().multiplyScalar(size / 2);
  const pts = [
    p1.clone().sub(half), p1.clone().add(half),
    p2.clone().sub(half), p2.clone().add(half),
  ];
  const geom = new Three.BufferGeometry().setFromPoints(pts);
  geom.setIndex([0, 1, 2, 3]);
  const mat = new Three.LineBasicMaterial({
    color: LINE_COLOR, depthTest: false, transparent: true, opacity: 0.85,
  });
  const seg = new Three.LineSegments(geom, mat);
  seg.renderOrder = 10000;
  return seg;
}

function buildGuide(p1, p2, text) {
  const g = new Three.Group();
  g.name = 'measureGuide';
  g.renderOrder = 10000;
  g.add(buildMeasureLine(p1, p2));
  g.add(buildTicks(p1, p2, 6));
  const label = createLabel(text);
  label.position.lerpVectors(p1, p2, 0.5);
  label.position.y += 5;
  g.add(label);
  return g;
}

// ─── Distance formatter (mm) ─────────────────────────────────────────────────

function formatMM(distCM) {
  const mm = distCM * 10;
  if (mm < 1000) return `${Math.round(mm)} mm`;
  return `${(mm / 1000).toFixed(2)} m`;
}

// ─── Snap-target extraction ──────────────────────────────────────────────────

/**
 * Collect all snap-worthy positions from the Redux scene.
 * Returns { corners, edges, openings }
 */
function collectSnapTargets(sceneState) {
  const corners = [], edges = [], openings = [];
  if (!sceneState) {
    console.warn('[MeasureTool.collectSnapTargets] sceneState is null');
    return { corners, edges, openings };
  }

  const layerID = sceneState.get('selectedLayer');
  const layer   = sceneState.getIn(['layers', layerID]);
  if (!layer) {
    console.warn('[MeasureTool.collectSnapTargets] no layer for id:', layerID);
    return { corners, edges, openings };
  }

  const vertices = layer.get('vertices');
  const lines    = layer.get('lines');
  const holes    = layer.get('holes');

  console.log('[MeasureTool.collectSnapTargets] layer:', layerID, {
    vertexCount: vertices?.size ?? 0,
    lineCount:   lines?.size   ?? 0,
    holeCount:   holes?.size   ?? 0,
  });

  // Floor slab height
  let slabH = 20;
  try {
    layer.get('areas').forEach(area => {
      const ft = area?.getIn(['properties', 'floorThickness', 'length']);
      if (ft) { slabH = ft; return false; }
    });
  } catch (_) { /* default */ }

  if (!vertices || !lines) return { corners, edges, openings, itemPoints: [] };

  // ── Wall corners + edges ──
  lines.forEach((line) => {
    const vIDs = line.get('vertices');
    if (!vIDs || vIDs.size < 2) return;
    const v0 = vertices.get(vIDs.get(0));
    const v1 = vertices.get(vIDs.get(1));
    if (!v0 || !v1) return;

    const x0 = v0.get('x'), y0 = v0.get('y');
    const x1 = v1.get('x'), y1 = v1.get('y');
    const thickness = line.getIn(['properties', 'thickness', 'length']) || 20;
    const wallH = line.getIn(['properties', 'height', 'length']) || 280;
    const halfT = thickness / 2;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    // Perpendicular normal in plan → 3D
    const nx = -dy / len, ny = dx / len;
    const n3x = nx, n3z = -ny;
    const cx0 = x0, cz0 = -y0;
    const cx1 = x1, cz1 = -y1;

    // Inner / outer corners at each endpoint — floor (slab top) and ceiling only.
    // No ground-level (y=0) points and no wall centre-line snapping.
    for (const [cx, cz] of [[cx0, cz0], [cx1, cz1]]) {
      for (const s of [-1, 1]) {
        const px = cx + n3x * halfT * s;
        const pz = cz + n3z * halfT * s;
        corners.push(new Three.Vector3(px, slabH, pz));          // wall-floor meeting
        corners.push(new Three.Vector3(px, slabH + wallH, pz));  // wall-ceiling meeting
      }
    }

    // Inner and outer face edge segments only — no centre-line (s=0 removed)
    for (const s of [-1, 1]) {
      const a = new Three.Vector3(cx0 + n3x * halfT * s, slabH, cz0 + n3z * halfT * s);
      const b = new Three.Vector3(cx1 + n3x * halfT * s, slabH, cz1 + n3z * halfT * s);
      edges.push({ a, b });
    }
  });

  // ── Items ──
  const itemPoints = [];
  const items = layer.get('items');
  if (items) {
    items.forEach((item) => {
      const ix = item.get('x');
      const iy = item.get('y');
      if (ix !== undefined && iy !== undefined) {
        itemPoints.push(new Three.Vector3(ix, slabH, -iy));
      }
    });
  }

  // ── Openings ──
  if (holes) {
    holes.forEach((hole) => {
      const lineID = hole.get('line');
      if (!lineID) return;
      const line = lines.get(lineID);
      if (!line) return;
      const vIDs = line.get('vertices');
      if (!vIDs || vIDs.size < 2) return;
      const v0 = vertices.get(vIDs.get(0));
      const v1 = vertices.get(vIDs.get(1));
      if (!v0 || !v1) return;

      const x0 = v0.get('x'), y0 = v0.get('y');
      const x1 = v1.get('x'), y1 = v1.get('y');
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;

      const offset  = hole.get('offset') || 0;
      const holeW   = hole.getIn(['properties', 'width', 'length']) || 80;
      const holeH   = hole.getIn(['properties', 'height', 'length']) || 210;
      const holeAlt = hole.getIn(['properties', 'altitude', 'length']) || 0;
      const thickness = line.getIn(['properties', 'thickness', 'length']) || 20;
      const halfT = thickness / 2;
      const nx = -dy / len, ny = dx / len;
      const n3x = nx, n3z = -ny;
      const halfW = holeW / 2;

      // Centre of hole along wall
      const hcx = x0 + dx * offset;
      const hcy = y0 + dy * offset;

      for (const sign of [-1, 1]) {
        const ex = hcx + (dx / len) * halfW * sign;
        const ey = hcy + (dy / len) * halfW * sign;
        const e3x = ex, e3z = -ey;

        for (const ns of [-1, 1]) {
          const px = e3x + n3x * halfT * ns;
          const pz = e3z + n3z * halfT * ns;
          openings.push(new Three.Vector3(px, slabH + holeAlt, pz));
          openings.push(new Three.Vector3(px, slabH + holeAlt + holeH, pz));
        }
      }
    });
  }

  console.log('[MeasureTool.collectSnapTargets] done:', { corners: corners.length, edges: edges.length, openings: openings.length, itemPoints: itemPoints.length });
  return { corners, edges, openings, itemPoints };
}


// ═══════════════════════════════════════════════════════════════════════════════
//  MeasureTool class
// ═══════════════════════════════════════════════════════════════════════════════

export default class MeasureTool {
  constructor(scene3D, camera, renderer) {
    this.scene    = scene3D;
    this.camera   = camera;
    this.renderer = renderer;

    this.root = new Three.Group();
    this.root.name = '__measureTool__';
    this.scene.add(this.root);

    this._firstPoint    = null;
    this._currentPoint  = null;
    this._previewGuide  = null;
    this._resultGuides  = [];
    this._snapMarker    = null;
    this._snapType      = null;
    this._unit          = 'cm';
    this._cachedScene   = null;
    this._cachedTargets = null;

    this._initSnapMarker();
    window.__viewer3DMeasureTool = this;

    console.log('[MeasureTool] constructed', {
      hasScene: !!scene3D,
      hasCamera: !!camera,
      cameraType: camera?.type,
      hasRenderer: !!renderer,
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  get active() { return this._firstPoint !== null; }
  get hasResults() { return this._resultGuides.length > 0; }
  setUnit(u) { this._unit = u || 'cm'; }

  onMouseMove(mouse, planMesh, sceneState) {
    const hit = this._raycastGround(mouse);
    if (!hit) {
      console.warn('[MeasureTool.onMouseMove] ground-plane raycast returned null', {
        mouse: { x: mouse?.x, y: mouse?.y },
        cameraPos: this.camera?.position,
        planeNormal: _plane.normal,
        planeConst: _plane.constant,
      });
      this._snapMarker.visible = false;
      return;
    }

    const targets = this._getSnapTargets(sceneState);
    const snapped = this._snap(hit, targets);
    this._currentPoint = snapped.point.clone();
    this._snapType     = snapped.type;

    // Log at most every 300 ms to avoid flooding the console
    const now = Date.now();
    if (!this._lastMoveLog || now - this._lastMoveLog > 300) {
      this._lastMoveLog = now;
      console.log('[MeasureTool.onMouseMove]', {
        hit: hit.toArray().map(v => +v.toFixed(1)),
        snapType: snapped.type,
        snapPt: snapped.point.toArray().map(v => +v.toFixed(1)),
        corners: targets.corners.length,
        edges: targets.edges.length,
        openings: targets.openings.length,
        items: targets.itemPoints?.length ?? 0,
        hasFirst: !!this._firstPoint,
      });
    }

    this._snapMarker.visible = true;
    this._snapMarker.position.copy(snapped.point);
    this._snapMarker.material.color.setHex(
      snapped.type === 'corner' || snapped.type === 'opening' ? SNAP_CORNER_COLOR : SNAP_COLOR
    );

    if (this._firstPoint) this._updatePreview();
  }

  onClick() {
    console.log('[MeasureTool.onClick] state:', {
      hasCurrentPoint: !!this._currentPoint,
      currentPt: this._currentPoint?.toArray().map(v => +v.toFixed(1)),
      hasFirstPoint:   !!this._firstPoint,
      firstPt: this._firstPoint?.toArray().map(v => +v.toFixed(1)),
    });
    if (!this._currentPoint) {
      console.warn('[MeasureTool.onClick] no _currentPoint — did onMouseMove run first?');
      return false;
    }
    if (!this._firstPoint) {
      this._firstPoint = this._currentPoint.clone();
      console.log('[MeasureTool.onClick] first point placed', this._firstPoint.toArray().map(v => +v.toFixed(1)));
      return false;
    }
    const p1 = this._firstPoint, p2 = this._currentPoint.clone();
    const dist = p1.distanceTo(p2);
    console.log('[MeasureTool.onClick] second point placed — dist:', dist.toFixed(1), 'label:', formatMM(dist));
    if (dist > 1) {
      const guide = buildGuide(p1, p2, formatMM(dist));
      this.root.add(guide);
      this._resultGuides.push(guide);
      console.log('[MeasureTool.onClick] guide added to root. Root children count:', this.root.children.length);
    } else {
      console.warn('[MeasureTool.onClick] dist too small (< 1), skipping guide');
    }
    this._firstPoint = null;
    this._clearPreview();
    return true;
  }

  cancel() {
    this._firstPoint = null;
    this._currentPoint = null;
    this._clearPreview();
    if (this._snapMarker) this._snapMarker.visible = false;
  }

  clearAll() {
    this.cancel();
    for (const g of this._resultGuides) {
      this.root.remove(g);
      g.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
      });
    }
    this._resultGuides = [];
  }

  dispose() {
    this.clearAll();
    if (this._snapMarker) { this._snapMarker.geometry?.dispose(); this._snapMarker.material?.dispose(); }
    if (this.scene) this.scene.remove(this.root);
    this.root = null;
    if (window.__viewer3DMeasureTool === this) window.__viewer3DMeasureTool = null;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  _initSnapMarker() {
    const geo = new Three.SphereGeometry(MARKER_RADIUS, 16, 16);
    const mat = new Three.MeshBasicMaterial({
      color: SNAP_COLOR, depthTest: false, transparent: true, opacity: 0.85,
    });
    this._snapMarker = new Three.Mesh(geo, mat);
    this._snapMarker.renderOrder = 10002;
    this._snapMarker.visible = false;
    this.root.add(this._snapMarker);
  }

  _raycastGround(mouse) {
    if (!this.camera) {
      console.error('[MeasureTool._raycastGround] camera is null/undefined');
      return null;
    }
    _ray.setFromCamera(mouse, this.camera);
    const pt = new Three.Vector3();
    const result = _ray.ray.intersectPlane(_plane, pt);
    if (!result) {
      // Only log occasionally to avoid spam
      if (!this._warnedRaycast) {
        console.warn('[MeasureTool._raycastGround] ray does not intersect y=0 plane. Camera pos:', this.camera.position, '| ray dir:', _ray.ray.direction);
        this._warnedRaycast = true;
      }
      return null;
    }
    this._warnedRaycast = false;
    return pt;
  }

  _getSnapTargets(sceneState) {
    if (!sceneState) {
      console.warn('[MeasureTool._getSnapTargets] sceneState is null/undefined');
      return { corners: [], edges: [], openings: [] };
    }
    if (sceneState !== this._cachedScene) {
      this._cachedScene = sceneState;
      this._cachedTargets = collectSnapTargets(sceneState);
      const t = this._cachedTargets;
      console.log('[MeasureTool._getSnapTargets] rebuilt snap targets:', {
        corners: t.corners.length,
        edges: t.edges.length,
        openings: t.openings.length,
        itemPoints: t.itemPoints?.length ?? 0,
        selectedLayer: sceneState.get('selectedLayer'),
      });
    }
    return this._cachedTargets;
  }

  _snap(raw, targets) {
    let best;
    // 1. Wall corners (inner/outer · floor & ceiling meeting points — highest priority)
    best = this._snapPoints(raw, targets.corners, SNAP_RADIUS);
    if (best) return { point: best, type: 'corner' };
    // 2. Opening corners (door / window edges)
    best = this._snapPoints(raw, targets.openings, SNAP_RADIUS);
    if (best) return { point: best, type: 'opening' };
    // 3. Item centres
    best = this._snapPoints(raw, targets.itemPoints || [], SNAP_RADIUS);
    if (best) return { point: best, type: 'item' };
    // 4. Wall face edges (inner + outer only — no centre-line)
    best = this._snapEdges(raw, targets.edges, EDGE_SNAP_RADIUS);
    if (best) return { point: best, type: 'edge' };
    // 5. Grid fallback
    const gx = Math.round(raw.x / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
    const gz = Math.round(raw.z / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
    return { point: new Three.Vector3(gx, raw.y, gz), type: 'grid' };
  }

  _snapPoints(raw, pts, radius) {
    let bd = radius, bp = null;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const d = Math.sqrt((raw.x - p.x) ** 2 + (raw.z - p.z) ** 2);
      if (d < bd) { bd = d; bp = p; }
    }
    return bp;
  }

  _snapEdges(raw, segs, radius) {
    let bd = radius, bp = null;
    for (const s of segs) {
      const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 1) continue;
      const t = Math.max(0, Math.min(1, ((raw.x - s.a.x) * dx + (raw.z - s.a.z) * dz) / lenSq));
      const cx = s.a.x + t * dx, cz = s.a.z + t * dz;
      const d = Math.sqrt((raw.x - cx) ** 2 + (raw.z - cz) ** 2);
      if (d < bd) { bd = d; bp = new Three.Vector3(cx, s.a.y, cz); }
    }
    return bp;
  }

  _updatePreview() {
    this._clearPreview();
    if (!this._firstPoint || !this._currentPoint) return;
    const dist = this._firstPoint.distanceTo(this._currentPoint);
    if (dist < 1) return;
    this._previewGuide = buildGuide(this._firstPoint, this._currentPoint, formatMM(dist));
    this.root.add(this._previewGuide);
  }

  _clearPreview() {
    if (this._previewGuide) {
      this.root.remove(this._previewGuide);
      this._previewGuide.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
      });
      this._previewGuide = null;
    }
  }
}
