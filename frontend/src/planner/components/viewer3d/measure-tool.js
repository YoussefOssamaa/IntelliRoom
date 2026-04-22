/**
 * 3D Measure Tool — two-click point-to-point measurement with strong snapping.
 *
 * Snap behaviour is driven by the nearest visible target in screen space so the
 * marker lands where the cursor visually aims, not just where the ground-plane
 * math happens to be closest.
 */

import * as Three from "three";

const POINT_SNAP_RADIUS_PX = 28;
const EDGE_SNAP_RADIUS_PX = 20;
const SNAP_RELEASE_RADIUS_PX = 36;

const LINE_COLOR = 0x000000;
const SNAP_COLOR = 0xf97316;
const SNAP_CORNER_COLOR = 0x22c55e;
const MARKER_RADIUS = 3;

const _ray = new Three.Raycaster();
const _plane = new Three.Plane(new Three.Vector3(0, 1, 0), 0);
const _box = new Three.Box3();
const _line3 = new Three.Line3();
const _projectedPoint = new Three.Vector3();
const _screenA = new Three.Vector2();
const _screenB = new Three.Vector2();
const _screenMouse = new Three.Vector2();

function createLabel(text) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fontSize = 26 * dpr;
  const padH = 12 * dpr;
  const padV = 8 * dpr;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  ctx.font = `600 ${fontSize}px "Inter","Segoe UI",sans-serif`;
  const tw = ctx.measureText(text).width;
  canvas.width = Math.ceil(tw + padH * 2);
  canvas.height = Math.ceil(fontSize + padV * 2);
  const w = canvas.width;
  const h = canvas.height;

  const r = 6 * dpr;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  ctx.fillStyle = "#000000";
  ctx.font = `600 ${fontSize}px "Inter","Segoe UI",sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
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

function buildMeasureLine(p1, p2) {
  const geom = new Three.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new Three.LineBasicMaterial({
    color: LINE_COLOR,
    depthTest: false,
    transparent: true,
    opacity: 0.85,
    linewidth: 1,
  });
  const line = new Three.Line(geom, mat);
  line.renderOrder = 10000;
  return line;
}

function buildTicks(p1, p2, size) {
  const dir = new Three.Vector3().subVectors(p2, p1).normalize();
  const perp = new Three.Vector3(-dir.z, 0, dir.x);
  if (perp.lengthSq() < 0.001) perp.set(0, 1, 0);
  const half = perp.clone().multiplyScalar(size / 2);
  const pts = [
    p1.clone().sub(half),
    p1.clone().add(half),
    p2.clone().sub(half),
    p2.clone().add(half),
  ];
  const geom = new Three.BufferGeometry().setFromPoints(pts);
  geom.setIndex([0, 1, 2, 3]);
  const mat = new Three.LineBasicMaterial({
    color: LINE_COLOR,
    depthTest: false,
    transparent: true,
    opacity: 0.85,
  });
  const seg = new Three.LineSegments(geom, mat);
  seg.renderOrder = 10000;
  return seg;
}

function buildGuide(p1, p2, text) {
  const g = new Three.Group();
  g.name = "measureGuide";
  g.renderOrder = 10000;
  g.add(buildMeasureLine(p1, p2));
  g.add(buildTicks(p1, p2, 6));
  const label = createLabel(text);
  label.position.lerpVectors(p1, p2, 0.5);
  label.position.y += 5;
  g.add(label);
  return g;
}

function formatMM(distCM) {
  const mm = distCM * 10;
  if (mm < 1000) return `${Math.round(mm)} mm`;
  return `${(mm / 1000).toFixed(2)} m`;
}

function getLayerSlabHeight(layer) {
  let slabHeight = 20;
  try {
    layer.get("areas")?.forEach?.((area) => {
      const floorThickness = area?.getIn?.([
        "properties",
        "floorThickness",
        "length",
      ]);
      if (floorThickness) {
        slabHeight = floorThickness;
        return false;
      }
      return undefined;
    });
  } catch (_) {
    return slabHeight;
  }
  return slabHeight;
}

function pushPoint(targets, key, position, type, priority) {
  if (!position) return;
  targets.points.push({ key, position, type, priority });
}

function pushEdge(targets, key, a, b, type, priority) {
  if (!a || !b || a.distanceToSquared(b) < 1e-6) return;
  targets.edges.push({ key, a, b, type, priority });
}

function projectWorldToScreen(point, camera, renderer, target) {
  const projected = _projectedPoint.copy(point).project(camera);
  if (
    !Number.isFinite(projected.x) ||
    !Number.isFinite(projected.y) ||
    !Number.isFinite(projected.z)
  ) {
    return null;
  }
  if (projected.z < -1.15 || projected.z > 1.15) {
    return null;
  }

  const width =
    renderer?.domElement?.clientWidth || renderer?.domElement?.width || 1;
  const height =
    renderer?.domElement?.clientHeight || renderer?.domElement?.height || 1;
  target.set(
    (projected.x * 0.5 + 0.5) * width,
    (-projected.y * 0.5 + 0.5) * height,
  );
  return target;
}

function getScreenDistanceToSegment(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;

  if (lenSq < 1e-6) {
    const dx = point.x - a.x;
    const dy = point.y - a.y;
    return { distance: Math.sqrt(dx * dx + dy * dy), t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / lenSq),
  );
  const closestX = a.x + abx * t;
  const closestY = a.y + aby * t;
  const dx = point.x - closestX;
  const dy = point.y - closestY;
  return { distance: Math.sqrt(dx * dx + dy * dy), t };
}

function collectSnapTargets(sceneState, sceneGraph) {
  const targets = { points: [], edges: [] };
  if (!sceneState?.get) return targets;

  const layerID = sceneState.get("selectedLayer");
  const layer = layerID ? sceneState.getIn(["layers", layerID]) : null;
  if (!layer?.get) return targets;

  const slabHeight = getLayerSlabHeight(layer);
  const vertices = layer.get("vertices");
  const lines = layer.get("lines");
  const holes = layer.get("holes");

  lines?.forEach?.((line, lineID) => {
    const vertexIDs = line.get("vertices");
    if (!vertexIDs || vertexIDs.size < 2) return;

    const v0 = vertices.get(vertexIDs.get(0));
    const v1 = vertices.get(vertexIDs.get(1));
    if (!v0 || !v1) return;

    const x0 = v0.get("x");
    const y0 = v0.get("y");
    const x1 = v1.get("x");
    const y1 = v1.get("y");
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1) return;

    const wallHeight = line.getIn(["properties", "height", "length"]) || 280;
    const thickness = line.getIn(["properties", "thickness", "length"]) || 20;
    const halfThickness = thickness / 2;
    const nx = -dy / length;
    const ny = dx / length;
    const normalX = nx;
    const normalZ = -ny;

    const startCenter = new Three.Vector3(x0, slabHeight, -y0);
    const endCenter = new Three.Vector3(x1, slabHeight, -y1);
    pushPoint(
      targets,
      `wall-center-start-${lineID}`,
      startCenter.clone(),
      "corner",
      0,
    );
    pushPoint(
      targets,
      `wall-center-end-${lineID}`,
      endCenter.clone(),
      "corner",
      0,
    );

    [-1, 1].forEach((side) => {
      const startFloor = new Three.Vector3(
        x0 + normalX * halfThickness * side,
        slabHeight,
        -y0 + normalZ * halfThickness * side,
      );
      const endFloor = new Three.Vector3(
        x1 + normalX * halfThickness * side,
        slabHeight,
        -y1 + normalZ * halfThickness * side,
      );
      const startCeiling = startFloor.clone().setY(slabHeight + wallHeight);
      const endCeiling = endFloor.clone().setY(slabHeight + wallHeight);

      pushPoint(
        targets,
        `wall-corner-start-floor-${lineID}-${side}`,
        startFloor,
        "corner",
        0,
      );
      pushPoint(
        targets,
        `wall-corner-end-floor-${lineID}-${side}`,
        endFloor,
        "corner",
        0,
      );
      pushPoint(
        targets,
        `wall-corner-start-top-${lineID}-${side}`,
        startCeiling,
        "corner",
        1,
      );
      pushPoint(
        targets,
        `wall-corner-end-top-${lineID}-${side}`,
        endCeiling,
        "corner",
        1,
      );
      pushEdge(
        targets,
        `wall-floor-edge-${lineID}-${side}`,
        startFloor,
        endFloor,
        "edge",
        3,
      );
    });
  });

  holes?.forEach?.((hole, holeID) => {
    const lineID = hole.get("line");
    const line = lines?.get?.(lineID);
    if (!line) return;

    const vertexIDs = line.get("vertices");
    if (!vertexIDs || vertexIDs.size < 2) return;

    const v0 = vertices.get(vertexIDs.get(0));
    const v1 = vertices.get(vertexIDs.get(1));
    if (!v0 || !v1) return;

    const x0 = v0.get("x");
    const y0 = v0.get("y");
    const x1 = v1.get("x");
    const y1 = v1.get("y");
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1) return;

    const offset = hole.get("offset") || 0;
    const holeWidth = hole.getIn(["properties", "width", "length"]) || 80;
    const holeHeight = hole.getIn(["properties", "height", "length"]) || 210;
    const holeAltitude = hole.getIn(["properties", "altitude", "length"]) || 0;
    const thickness = line.getIn(["properties", "thickness", "length"]) || 20;
    const halfThickness = thickness / 2;
    const nx = -dy / length;
    const ny = dx / length;
    const normalX = nx;
    const normalZ = -ny;
    const dirX = dx / length;
    const dirZ = -dy / length;
    const halfWidth = holeWidth / 2;

    const centerX = x0 + dx * offset;
    const centerY = y0 + dy * offset;
    const bottomY = slabHeight + holeAltitude;
    const topY = bottomY + holeHeight;

    [-1, 1].forEach((widthSide) => {
      const edgeCenterX = centerX + dirX * halfWidth * widthSide;
      const edgeCenterZ = -centerY + dirZ * halfWidth * widthSide;

      [-1, 1].forEach((thicknessSide) => {
        const baseKey = `opening-${holeID}-${widthSide}-${thicknessSide}`;
        const bottomPoint = new Three.Vector3(
          edgeCenterX + normalX * halfThickness * thicknessSide,
          bottomY,
          edgeCenterZ + normalZ * halfThickness * thicknessSide,
        );
        const topPoint = bottomPoint.clone().setY(topY);

        pushPoint(targets, `${baseKey}-bottom`, bottomPoint, "opening", 1);
        pushPoint(targets, `${baseKey}-top`, topPoint, "opening", 1);
        pushEdge(
          targets,
          `${baseKey}-vertical`,
          bottomPoint,
          topPoint,
          "opening",
          1,
        );
      });
    });
  });

  const sceneLayer = sceneGraph?.layers?.[layerID];
  if (sceneLayer?.items) {
    Object.entries(sceneLayer.items).forEach(([itemID, object3D]) => {
      if (!object3D) return;
      const box = _box.makeEmpty().setFromObject(object3D);
      if (box.isEmpty()) return;

      const center = box.getCenter(new Three.Vector3());
      const { min, max } = box;
      pushPoint(targets, `item-center-${itemID}`, center, "object", 2);

      const corners = [
        new Three.Vector3(min.x, min.y, min.z),
        new Three.Vector3(min.x, min.y, max.z),
        new Three.Vector3(min.x, max.y, min.z),
        new Three.Vector3(min.x, max.y, max.z),
        new Three.Vector3(max.x, min.y, min.z),
        new Three.Vector3(max.x, min.y, max.z),
        new Three.Vector3(max.x, max.y, min.z),
        new Three.Vector3(max.x, max.y, max.z),
      ];

      corners.forEach((corner, index) => {
        pushPoint(
          targets,
          `item-corner-${itemID}-${index}`,
          corner,
          "object",
          2,
        );
      });
    });
  }

  return targets;
}

export default class MeasureTool {
  constructor(scene3D, camera, renderer) {
    this.scene = scene3D;
    this.camera = camera;
    this.renderer = renderer;

    this.root = new Three.Group();
    this.root.name = "__measureTool__";
    this.scene.add(this.root);

    this._firstPoint = null;
    this._currentPoint = null;
    this._previewGuide = null;
    this._resultGuides = [];
    this._snapMarker = null;
    this._snapType = null;
    this._unit = "cm";
    this._cachedScene = null;
    this._cachedSceneGraph = null;
    this._cachedTargets = { points: [], edges: [] };
    this._activeSnap = null;

    this._initSnapMarker();
    window.__viewer3DMeasureTool = this;
  }

  get active() {
    return this._firstPoint !== null;
  }

  get hasResults() {
    return this._resultGuides.length > 0;
  }

  setUnit(unit) {
    this._unit = unit || "cm";
  }

  onMouseMove(mouse, planDataOrPlan, sceneState, sceneGraphOverride) {
    const planRoot = planDataOrPlan?.plan || planDataOrPlan;
    const sceneGraph = planDataOrPlan?.sceneGraph || sceneGraphOverride || null;
    const hit =
      this._raycastSurface(mouse, planRoot) || this._raycastGround(mouse);

    if (!hit) {
      this._snapMarker.visible = false;
      this._activeSnap = null;
      return;
    }

    const targets = this._getSnapTargets(sceneState, sceneGraph);
    const snapped = this._snap(mouse, hit, targets);
    this._currentPoint = snapped.point.clone();
    this._snapType = snapped.type;

    this._snapMarker.visible = true;
    this._snapMarker.position.copy(snapped.point);
    this._snapMarker.material.color.setHex(
      snapped.type === "edge" || snapped.type === "free"
        ? SNAP_COLOR
        : SNAP_CORNER_COLOR,
    );

    if (this._firstPoint) {
      this._updatePreview();
    }
  }

  onClick() {
    if (!this._currentPoint) {
      return false;
    }

    if (!this._firstPoint) {
      this._firstPoint = this._currentPoint.clone();
      return false;
    }

    const p1 = this._firstPoint;
    const p2 = this._currentPoint.clone();
    const distance = p1.distanceTo(p2);
    if (distance > 1) {
      const guide = buildGuide(p1, p2, formatMM(distance));
      this.root.add(guide);
      this._resultGuides.push(guide);
    }

    this._firstPoint = null;
    this._clearPreview();
    return true;
  }

  cancel() {
    this._firstPoint = null;
    this._currentPoint = null;
    this._activeSnap = null;
    this._clearPreview();
    if (this._snapMarker) this._snapMarker.visible = false;
  }

  clearAll() {
    this.cancel();
    this._resultGuides.forEach((guide) => {
      this.root.remove(guide);
      guide.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    });
    this._resultGuides = [];
  }

  dispose() {
    this.clearAll();
    if (this._snapMarker) {
      this._snapMarker.geometry?.dispose();
      this._snapMarker.material?.dispose();
    }
    if (this.scene) this.scene.remove(this.root);
    this.root = null;
    if (window.__viewer3DMeasureTool === this)
      window.__viewer3DMeasureTool = null;
  }

  _initSnapMarker() {
    const geometry = new Three.SphereGeometry(MARKER_RADIUS, 18, 18);
    const material = new Three.MeshBasicMaterial({
      color: SNAP_COLOR,
      depthTest: false,
      transparent: true,
      opacity: 0.92,
    });
    this._snapMarker = new Three.Mesh(geometry, material);
    this._snapMarker.renderOrder = 10002;
    this._snapMarker.visible = false;
    this.root.add(this._snapMarker);
  }

  _shouldIgnoreIntersection(object) {
    let current = object;
    while (current) {
      if (current === this.root || current.name === "measureGuide") {
        return true;
      }
      if (current.userData?.isPreview || current.userData?.isGhost) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  _raycastSurface(mouse, planRoot) {
    if (!this.camera || !planRoot) return null;

    _ray.setFromCamera(mouse, this.camera);
    const intersections = _ray.intersectObject(planRoot, true);
    for (let index = 0; index < intersections.length; index += 1) {
      const intersection = intersections[index];
      if (this._shouldIgnoreIntersection(intersection.object)) continue;
      return intersection.point.clone();
    }
    return null;
  }

  _raycastGround(mouse) {
    if (!this.camera) return null;
    _ray.setFromCamera(mouse, this.camera);
    const point = new Three.Vector3();
    return _ray.ray.intersectPlane(_plane, point) ? point : null;
  }

  _getMouseScreenPoint(mouse) {
    const width =
      this.renderer?.domElement?.clientWidth ||
      this.renderer?.domElement?.width ||
      1;
    const height =
      this.renderer?.domElement?.clientHeight ||
      this.renderer?.domElement?.height ||
      1;
    return _screenMouse.set(
      (mouse.x * 0.5 + 0.5) * width,
      (-mouse.y * 0.5 + 0.5) * height,
    );
  }

  _getSnapTargets(sceneState, sceneGraph) {
    if (
      sceneState !== this._cachedScene ||
      sceneGraph !== this._cachedSceneGraph
    ) {
      this._cachedScene = sceneState;
      this._cachedSceneGraph = sceneGraph;
      this._cachedTargets = collectSnapTargets(sceneState, sceneGraph);
    }
    return this._cachedTargets;
  }

  _pickBetterCandidate(current, next) {
    if (!current) return next;
    if (!next) return current;
    if (Math.abs(current.score - next.score) > 0.001) {
      return current.score < next.score ? current : next;
    }
    return current.priority <= next.priority ? current : next;
  }

  _findBestPointSnap(mousePoint, points) {
    let best = null;

    for (let index = 0; index < points.length; index += 1) {
      const target = points[index];
      const screenPoint = projectWorldToScreen(
        target.position,
        this.camera,
        this.renderer,
        _screenA,
      );
      if (!screenPoint) continue;

      const dx = mousePoint.x - screenPoint.x;
      const dy = mousePoint.y - screenPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const limit =
        this._activeSnap?.key === target.key
          ? SNAP_RELEASE_RADIUS_PX
          : POINT_SNAP_RADIUS_PX;
      if (distance > limit) continue;

      const score =
        distance +
        target.priority * 0.35 -
        (this._activeSnap?.key === target.key ? 2 : 0);
      best = this._pickBetterCandidate(best, {
        key: target.key,
        type: target.type,
        point: target.position,
        priority: target.priority,
        screenDistance: distance,
        score,
      });
    }

    return best;
  }

  _findBestEdgeSnap(mousePoint, rawPoint, edges) {
    let best = null;

    for (let index = 0; index < edges.length; index += 1) {
      const edge = edges[index];
      const start = projectWorldToScreen(
        edge.a,
        this.camera,
        this.renderer,
        _screenA,
      );
      const end = projectWorldToScreen(
        edge.b,
        this.camera,
        this.renderer,
        _screenB,
      );
      if (!start || !end) continue;

      const { distance } = getScreenDistanceToSegment(mousePoint, start, end);
      const limit =
        this._activeSnap?.key === edge.key
          ? SNAP_RELEASE_RADIUS_PX
          : EDGE_SNAP_RADIUS_PX;
      if (distance > limit) continue;

      const point = _line3
        .set(edge.a, edge.b)
        .closestPointToPoint(rawPoint, true, new Three.Vector3());
      const score =
        distance +
        edge.priority * 0.35 +
        0.15 -
        (this._activeSnap?.key === edge.key ? 2 : 0);
      best = this._pickBetterCandidate(best, {
        key: edge.key,
        type: edge.type,
        point,
        priority: edge.priority,
        screenDistance: distance,
        score,
      });
    }

    return best;
  }

  _snap(mouse, rawPoint, targets) {
    const mousePoint = this._getMouseScreenPoint(mouse);
    const pointCandidate = this._findBestPointSnap(
      mousePoint,
      targets.points || [],
    );
    const edgeCandidate = this._findBestEdgeSnap(
      mousePoint,
      rawPoint,
      targets.edges || [],
    );
    const snappedCandidate = this._pickBetterCandidate(
      pointCandidate,
      edgeCandidate,
    );

    if (!snappedCandidate) {
      this._activeSnap = null;
      return { point: rawPoint.clone(), type: "free" };
    }

    this._activeSnap = {
      key: snappedCandidate.key,
      type: snappedCandidate.type,
    };

    return {
      point: snappedCandidate.point.clone(),
      type: snappedCandidate.type,
    };
  }

  _updatePreview() {
    this._clearPreview();
    if (!this._firstPoint || !this._currentPoint) return;
    const distance = this._firstPoint.distanceTo(this._currentPoint);
    if (distance < 1) return;
    this._previewGuide = buildGuide(
      this._firstPoint,
      this._currentPoint,
      formatMM(distance),
    );
    this.root.add(this._previewGuide);
  }

  _clearPreview() {
    if (!this._previewGuide) return;
    this.root.remove(this._previewGuide);
    this._previewGuide.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    this._previewGuide = null;
  }
}
