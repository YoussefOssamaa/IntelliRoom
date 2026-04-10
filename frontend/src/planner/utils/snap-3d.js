/**
 * Enhanced 3D Snapping utilities for item placement and dragging.
 *
 * Key improvements over the original implementation:
 *  - Hysteresis (snap-in distance < release distance) prevents flickering at
 *    threshold boundaries.
 *  - SnapState class tracks the active snap target between frames.
 *  - Wall normal calculation so items can be offset to sit *against* a wall
 *    rather than on its center-line.
 *  - Distance-weighted scoring chooses better candidates than pure priority.
 *  - Grid snap has a minimum-distance guard so stationary cursors are not
 *    needlessly re-positioned.
 *  - Caches wall / item lists per frame to avoid repeated Immutable traversals
 *    during the same mouse-move event.
 *
 * Uses geometry helpers from ./geometry where possible.
 */

import * as Three from 'three';
import {
  pointsDistance,
  angleBetweenTwoPoints,
} from './geometry';

// Footprint cache — keyed by mesh reference so it auto-clears on mesh rebuild
const _footprintCache = new WeakMap();

// ─── Snap type constants ──────────────────────────────────────────────────────
export const SNAP_3D_WALL = 'SNAP_3D_WALL';
export const SNAP_3D_GRID = 'SNAP_3D_GRID';
export const SNAP_3D_ITEM = 'SNAP_3D_ITEM';
export const SNAP_3D_NONE = 'SNAP_3D_NONE';

// ─── Default configuration ────────────────────────────────────────────────────
export const DEFAULT_SNAP_CONFIG = {
  enabled: true,

  // Wall snapping
  wallSnapDistance: 50,           // Max distance to snap *in* to a wall
  wallSnapReleaseDistance: 80,    // Must exceed this to *break free* (hysteresis)
  wallOffset: 5,                  // Extra offset from the wall surface (scene units)

  // Grid snapping
  gridSnapSize: 20,
  gridSnapMinDistance: 3,         // Ignore grid snap when cursor is already closer than this

  // Item-to-item snapping
  itemSnapDistance: 30,
  itemSnapReleaseDistance: 50,

  // Per-type enable flags
  snapTypes: {
    [SNAP_3D_WALL]: true,
    [SNAP_3D_GRID]: true,
    [SNAP_3D_ITEM]: true,
  },
};

// ─── SnapState — tracks snap target between frames for hysteresis ─────────────
/**
 * Create one instance per drag session and pass it to `applySnapping`.
 * Call `reset()` when a drag starts or ends.
 */
export class SnapState {
  constructor() {
    this.reset();
  }

  reset() {
    this.activeType = SNAP_3D_NONE;
    this.activeTarget = null;     // lineID (wall) or itemID (item)
    this.lastPosition = null;     // { x, z } of the last snapped position
    this.frameCount = 0;
  }

  /**
   * Decide whether the current snap should be *maintained* (hysteresis).
   * @param {number} distToTarget  Distance from the cursor to the previously
   *                                snapped target (recalculated each frame).
   * @param {object} config         Snap config.
   * @returns {boolean}
   */
  shouldMaintain(distToTarget, config) {
    if (this.activeType === SNAP_3D_NONE) return false;

    let releaseDistance;
    switch (this.activeType) {
      case SNAP_3D_WALL:
        releaseDistance = config.wallSnapReleaseDistance ?? config.wallSnapDistance * 1.6;
        break;
      case SNAP_3D_ITEM:
        releaseDistance = config.itemSnapReleaseDistance ?? config.itemSnapDistance * 1.6;
        break;
      default:
        return false;
    }
    return distToTarget < releaseDistance;
  }

  /** Update state after choosing a new snap. */
  update(type, target, position) {
    this.activeType = type;
    this.activeTarget = target;
    this.lastPosition = position ? { x: position.x, z: position.z } : null;
    this.frameCount++;
  }
}

// ─── Item footprint helpers ───────────────────────────────────────────────────

/**
 * Compute the local-space XZ half-extents of a mesh (rotation zeroed).
 * Cached per mesh reference.  Call once per drag start or lazily per item.
 */
export function computeItemFootprint(mesh) {
  if (!mesh) return { halfWidth: 15, halfDepth: 15 };
  if (_footprintCache.has(mesh)) return _footprintCache.get(mesh);

  const savedRot = mesh.rotation.y;
  mesh.rotation.y = 0;
  mesh.updateMatrixWorld(true);

  const box = new Three.Box3().setFromObject(mesh);
  const size = box.getSize(new Three.Vector3());

  mesh.rotation.y = savedRot;
  mesh.updateMatrixWorld(true);

  const fp = { halfWidth: size.x / 2, halfDepth: size.z / 2 };
  _footprintCache.set(mesh, fp);
  return fp;
}

/**
 * Given a local-space footprint and a Y-axis rotation, return the world-space
 * half-extents projected onto the X and Z axes.
 */
export function rotatedFootprint(fp, rotationY) {
  const c = Math.abs(Math.cos(rotationY));
  const s = Math.abs(Math.sin(rotationY));
  return {
    halfWidth: fp.halfWidth * c + fp.halfDepth * s,
    halfDepth: fp.halfWidth * s + fp.halfDepth * c,
  };
}

/**
 * Lerp between two angles, handling the ±PI wrap.
 */
export function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI)  diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/**
 * Closest point on a 2-D line segment and its distance from a query point.
 * Works in the XZ plane (3-D ground plane).
 */
export function distanceToLineSegment(px, pz, x1, z1, x2, z2) {
  const C = x2 - x1;
  const D = z2 - z1;
  const lenSq = C * C + D * D;

  let closestX, closestZ;

  if (lenSq < 1e-10) {
    // Degenerate segment (zero-length wall)
    closestX = x1;
    closestZ = z1;
  } else {
    const t = Math.max(0, Math.min(1, ((px - x1) * C + (pz - z1) * D) / lenSq));
    closestX = x1 + t * C;
    closestZ = z1 + t * D;
  }

  const dx = px - closestX;
  const dz = pz - closestZ;
  return { distance: Math.sqrt(dx * dx + dz * dz), closestX, closestZ };
}

/**
 * Compute the *outward-facing* unit normal of a wall segment relative to a
 * query point.  The normal always points *toward* the query point so that
 * wall-offset moves items away from the wall surface.
 */
export function getWallNormal(x1, z1, x2, z2, px, pz) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 1e-10) return { nx: 0, nz: 1 };

  // Two candidate normals (perpendicular to the wall)
  const n1x = -dz / len;
  const n1z =  dx / len;

  // Pick the one facing the query point (dot with point-to-midpoint vector)
  const mx = (x1 + x2) * 0.5;
  const mz = (z1 + z2) * 0.5;
  const dot = (px - mx) * n1x + (pz - mz) * n1z;

  return dot >= 0
    ? { nx: n1x, nz: n1z }
    : { nx: -n1x, nz: -n1z };
}

/**
 * Return the wall direction angle (radians) and a suggested item rotation so
 * the item faces *away* from the wall (perpendicular).
 */
export function getWallRotation(x1, z1, x2, z2, normal) {
  const wallAngle = Math.atan2(z2 - z1, x2 - x1);
  const suggestedRotation = Math.atan2(normal.nx, normal.nz);
  return { wallAngle, suggestedRotation };
}

// ─── Scene data extraction ────────────────────────────────────────────────────

/** Simple per-frame cache so repeated calls in the same event don't re-walk
 *  the Immutable tree. Keyed by the scene reference identity.               */
const _wallCache = new WeakMap();
const _itemCache = new WeakMap();

/**
 * Extract wall segments from the Immutable scene.
 * Results are cached per scene identity (reference equality).
 */
export function getWallsFromScene(scene) {
  if (_wallCache.has(scene)) return _wallCache.get(scene);

  const walls = [];
  const selectedLayer = scene.get('selectedLayer');

  scene.get('layers').forEach((layer, layerID) => {
    if (!layer.get('visible') && layerID !== selectedLayer) return;

    const vertices = layer.get('vertices');
    const lines = layer.get('lines');

    lines.forEach((line, lineID) => {
      const vertexIDs = line.get('vertices');
      if (!vertexIDs || vertexIDs.size < 2) return;

      const v0 = vertices.get(vertexIDs.get(0));
      const v1 = vertices.get(vertexIDs.get(1));
      if (!v0 || !v1) return;

      // 2-D plan (x,y) ➜ 3-D ground plane (x, -z)
      const wall = {
        x1: v0.get('x'),
        z1: -v0.get('y'),
        x2: v1.get('x'),
        z2: -v1.get('y'),
        lineID,
        layerID,
        // Wall thickness from line properties (if available)
        thickness: line.getIn(['properties', 'thickness', 'length']) || 20,
      };
      walls.push(wall);
    });
  });

  _wallCache.set(scene, walls);
  return walls;
}

/**
 * Extract scene items (excluding the one being dragged).
 * Cached per scene identity.
 */
export function getItemsFromScene(scene, excludeItemID = null) {
  // Cache key combines scene ref + exclude id
  let cacheMap = _itemCache.get(scene);
  if (cacheMap && cacheMap.has(excludeItemID)) return cacheMap.get(excludeItemID);

  const items = [];
  const selectedLayer = scene.get('selectedLayer');

  scene.get('layers').forEach((layer, layerID) => {
    if (!layer.get('visible') && layerID !== selectedLayer) return;

    layer.get('items').forEach((item, itemID) => {
      if (itemID === excludeItemID) return;
      items.push({
        x: item.get('x'),
        z: -item.get('y'),
        itemID,
        layerID,
        rotation: item.get('rotation') || 0,
      });
    });
  });

  if (!cacheMap) {
    cacheMap = new Map();
    _itemCache.set(scene, cacheMap);
  }
  cacheMap.set(excludeItemID, items);
  return items;
}

// ─── Individual snap functions ────────────────────────────────────────────────

/**
 * Snap to the nearest wall.
 * Returns the projected snap point *offset by the wall normal* so the item
 * sits against the wall instead of inside it.
 *
 * @param {number}  x
 * @param {number}  z
 * @param {Array}   walls         Output of getWallsFromScene
 * @param {number}  snapDistance   Maximum distance to snap
 * @param {number}  wallOffset     Extra offset from wall surface (scene units)
 * @returns {object|null}
 */
export function snapToWalls(x, z, walls, snapDistance, wallOffset = 0, dragFootprint = null) {
  let bestSnap = null;
  let bestDist = Infinity;

  for (const wall of walls) {
    const seg = distanceToLineSegment(x, z, wall.x1, wall.z1, wall.x2, wall.z2);
    if (seg.distance < snapDistance && seg.distance < bestDist) {
      bestDist = seg.distance;

      const normal = getWallNormal(wall.x1, wall.z1, wall.x2, wall.z2, x, z);
      const { wallAngle, suggestedRotation } = getWallRotation(
        wall.x1, wall.z1, wall.x2, wall.z2, normal
      );

      // When we have the dragged item's footprint, compute the depth using
      // the *suggested* rotation so the back face sits flush with the wall
      // surface (wall thickness/2 outward from the center-line).
      let totalOffset;
      if (dragFootprint) {
        const rotFP = rotatedFootprint(dragFootprint, suggestedRotation);
        totalOffset = (wall.thickness || 0) * 0.5 + rotFP.halfDepth;
      } else {
        totalOffset = (wall.thickness || 0) * 0.5 + wallOffset;
      }

      bestSnap = {
        x: seg.closestX + normal.nx * totalOffset,
        z: seg.closestZ + normal.nz * totalOffset,
        wallX: seg.closestX,
        wallZ: seg.closestZ,
        type: SNAP_3D_WALL,
        wall,
        distance: seg.distance,
        normal,
        wallAngle,
        suggestedRotation,
      };
    }
  }

  return bestSnap;
}

/**
 * Snap to the nearest grid intersection.
 * Returns null if the snap displacement is below `minDistance` (avoids jitter
 * when the cursor is already very close to a grid point).
 */
export function snapToGrid(x, z, gridSize, minDistance = 0) {
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedZ = Math.round(z / gridSize) * gridSize;
  const dx = x - snappedX;
  const dz = z - snappedZ;
  const distance = Math.sqrt(dx * dx + dz * dz);

  if (distance < minDistance) return null;

  return {
    x: snappedX,
    z: snappedZ,
    type: SNAP_3D_GRID,
    distance,
  };
}

/**
 * Snap to other items — edge-to-edge using bounding boxes when footprints
 * are available, falls back to axis-aligned / center-to-center otherwise.
 *
 * @param {number}  x
 * @param {number}  z
 * @param {Array}   items           Output of getItemsFromScene
 * @param {number}  snapDistance     Max edge-to-edge gap to trigger snap
 * @param {object}  [dragFootprint]  { halfWidth, halfDepth } of item being dragged
 * @param {object}  [sceneGraph]     planData.sceneGraph for mesh lookups
 * @param {number}  [dragRotation=0] Current Y rotation of dragged item
 */
export function snapToItems(x, z, items, snapDistance, dragFootprint = null, sceneGraph = null, dragRotation = 0) {
  let bestSnap = null;
  let bestDist = snapDistance;

  // World-space extents of the dragged item
  const dragFP = dragFootprint
    ? rotatedFootprint(dragFootprint, dragRotation)
    : null;

  for (const item of items) {
    // Try edge-to-edge snap when we have footprint info
    if (dragFP) {
      const otherFP = _getOtherFootprint(item, sceneGraph);
      const edgeSnap = _edgeSnap(x, z, dragFP, item, otherFP, snapDistance);
      if (edgeSnap && edgeSnap.distance < bestDist) {
        bestDist = edgeSnap.distance;
        bestSnap = edgeSnap;
      }
      continue; // skip legacy path when we have BB info
    }

    // Legacy center-based fallback
    const dx = Math.abs(x - item.x);
    const dz = Math.abs(z - item.z);

    if (dx < bestDist && dx < dz) {
      bestDist = dx;
      bestSnap = { x: item.x, z, type: SNAP_3D_ITEM, item, alignment: 'x', distance: dx };
    }
    if (dz < bestDist && dz <= dx) {
      bestDist = dz;
      bestSnap = { x, z: item.z, type: SNAP_3D_ITEM, item, alignment: 'z', distance: dz };
    }
    const cDist = Math.sqrt(dx * dx + dz * dz);
    if (cDist < bestDist) {
      bestDist = cDist;
      bestSnap = { x: item.x, z: item.z, type: SNAP_3D_ITEM, item, alignment: 'center', distance: cDist };
    }
  }

  return bestSnap;
}

// Resolve the world-space footprint for a scene item
function _getOtherFootprint(item, sceneGraph) {
  if (!sceneGraph) return { halfWidth: 15, halfDepth: 15 };
  const mesh = sceneGraph.layers?.[item.layerID]?.items?.[item.itemID];
  if (!mesh) return { halfWidth: 15, halfDepth: 15 };
  const local = computeItemFootprint(mesh);
  return rotatedFootprint(local, item.rotation * Math.PI / 180);
}

// Edge-to-edge snap between the dragged item (at x,z with dragFP) and a
// target item. Returns the snap that achieves flush contact (gap = 0) on
// the axis with the smallest separation.  Prevents overlap.
function _edgeSnap(x, z, dragFP, target, targetFP, snapDistance) {
  const dHW = dragFP.halfWidth;
  const dHD = dragFP.halfDepth;
  const tHW = targetFP.halfWidth;
  const tHD = targetFP.halfDepth;

  // Signed gaps along each axis (positive = no overlap)
  const gapRight = (target.x - tHW) - (x + dHW); // drag right → target left
  const gapLeft  = (x - dHW) - (target.x + tHW); // target right → drag left
  const gapFront = (target.z - tHD) - (z + dHD);
  const gapBack  = (z - dHD) - (target.z + tHD);

  // Check overlap on each axis independently
  const overlapX = (x + dHW > target.x - tHW) && (x - dHW < target.x + tHW);
  const overlapZ = (z + dHD > target.z - tHD) && (z - dHD < target.z + tHD);

  const candidates = [];

  // ─ X-axis edge snaps (only relevant when Z ranges overlap or are close) ─
  const zClose = Math.abs(z - target.z) < (dHD + tHD + snapDistance);
  if (zClose) {
    if (Math.abs(gapRight) < snapDistance && gapRight >= -1) {
      candidates.push({
        x: target.x - tHW - dHW, z,
        type: SNAP_3D_ITEM, item: target, alignment: 'edge-x',
        distance: Math.abs(gapRight),
      });
    }
    if (Math.abs(gapLeft) < snapDistance && gapLeft >= -1) {
      candidates.push({
        x: target.x + tHW + dHW, z,
        type: SNAP_3D_ITEM, item: target, alignment: 'edge-x',
        distance: Math.abs(gapLeft),
      });
    }
  }

  // ─ Z-axis edge snaps (only relevant when X ranges overlap or are close) ─
  const xClose = Math.abs(x - target.x) < (dHW + tHW + snapDistance);
  if (xClose) {
    if (Math.abs(gapFront) < snapDistance && gapFront >= -1) {
      candidates.push({
        x, z: target.z - tHD - dHD,
        type: SNAP_3D_ITEM, item: target, alignment: 'edge-z',
        distance: Math.abs(gapFront),
      });
    }
    if (Math.abs(gapBack) < snapDistance && gapBack >= -1) {
      candidates.push({
        x, z: target.z + tHD + dHD,
        type: SNAP_3D_ITEM, item: target, alignment: 'edge-z',
        distance: Math.abs(gapBack),
      });
    }
  }

  // ─ Overlap pushback: if fully overlapping on both axes, push out ─
  if (overlapX && overlapZ) {
    const pushRight = Math.abs((target.x - tHW) - (x + dHW));
    const pushLeft  = Math.abs((target.x + tHW) - (x - dHW));
    const pushFront = Math.abs((target.z - tHD) - (z + dHD));
    const pushBack  = Math.abs((target.z + tHD) - (z - dHD));
    const minPush = Math.min(pushRight, pushLeft, pushFront, pushBack);

    if (minPush === pushRight) {
      candidates.push({ x: target.x - tHW - dHW, z, type: SNAP_3D_ITEM, item: target, alignment: 'push', distance: minPush });
    } else if (minPush === pushLeft) {
      candidates.push({ x: target.x + tHW + dHW, z, type: SNAP_3D_ITEM, item: target, alignment: 'push', distance: minPush });
    } else if (minPush === pushFront) {
      candidates.push({ x, z: target.z - tHD - dHD, type: SNAP_3D_ITEM, item: target, alignment: 'push', distance: minPush });
    } else {
      candidates.push({ x, z: target.z + tHD + dHD, type: SNAP_3D_ITEM, item: target, alignment: 'push', distance: minPush });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}

// ─── Hysteresis helper ────────────────────────────────────────────────────────

/**
 * When we are already snapped to a wall or item, re-evaluate whether we should
 * *keep* snapping (with the larger release distance).  Returns the updated
 * snap result or null if we should release.
 */
function _tryMaintainSnap(x, z, scene, config, snapState, dragFP = null) {
  if (snapState.activeType === SNAP_3D_WALL && snapState.activeTarget != null) {
    const walls = getWallsFromScene(scene);
    const targetWall = walls.find(w => w.lineID === snapState.activeTarget);
    if (!targetWall) return null;

    const seg = distanceToLineSegment(x, z, targetWall.x1, targetWall.z1, targetWall.x2, targetWall.z2);

    if (!snapState.shouldMaintain(seg.distance, config)) return null;

    // Re-project with same offset logic
    const normal = getWallNormal(targetWall.x1, targetWall.z1, targetWall.x2, targetWall.z2, x, z);
    const { wallAngle, suggestedRotation } = getWallRotation(
      targetWall.x1, targetWall.z1, targetWall.x2, targetWall.z2, normal
    );
    // Use footprint-aware offset when available (same logic as snapToWalls)
    let totalOffset;
    if (dragFP) {
      const rotFP = rotatedFootprint(dragFP, suggestedRotation);
      totalOffset = (targetWall.thickness || 0) * 0.5 + rotFP.halfDepth;
    } else {
      totalOffset = (targetWall.thickness || 0) * 0.5 + (config.wallOffset || 0);
    }

    const snapInfo = {
      x: seg.closestX + normal.nx * totalOffset,
      z: seg.closestZ + normal.nz * totalOffset,
      wallX: seg.closestX,
      wallZ: seg.closestZ,
      type: SNAP_3D_WALL,
      wall: targetWall,
      distance: seg.distance,
      normal,
      wallAngle,
      suggestedRotation,
    };

    snapState.update(SNAP_3D_WALL, targetWall.lineID, snapInfo);

    return {
      x: snapInfo.x,
      z: snapInfo.z,
      snapped: true,
      snapType: SNAP_3D_WALL,
      snapInfo,
    };
  }

  if (snapState.activeType === SNAP_3D_ITEM && snapState.activeTarget != null) {
    const items = getItemsFromScene(scene, null);
    const targetItem = items.find(i => i.itemID === snapState.activeTarget);
    if (!targetItem) return null;

    const dist = pointsDistance(x, z, targetItem.x, targetItem.z);
    if (!snapState.shouldMaintain(dist, config)) return null;

    // Re-evaluate alignment type based on current position
    const dx = Math.abs(x - targetItem.x);
    const dz = Math.abs(z - targetItem.z);
    let snapInfo;
    if (dx < dz) {
      snapInfo = { x: targetItem.x, z, type: SNAP_3D_ITEM, item: targetItem, alignment: 'x', distance: dx };
    } else if (dz < dx) {
      snapInfo = { x, z: targetItem.z, type: SNAP_3D_ITEM, item: targetItem, alignment: 'z', distance: dz };
    } else {
      snapInfo = { x: targetItem.x, z: targetItem.z, type: SNAP_3D_ITEM, item: targetItem, alignment: 'center', distance: dist };
    }

    snapState.update(SNAP_3D_ITEM, targetItem.itemID, snapInfo);

    return {
      x: snapInfo.x,
      z: snapInfo.z,
      snapped: true,
      snapType: SNAP_3D_ITEM,
      snapInfo,
    };
  }

  return null;
}

// Snap-type distance threshold lookup
function _threshold(type, config) {
  switch (type) {
    case SNAP_3D_WALL: return config.wallSnapDistance;
    case SNAP_3D_ITEM: return config.itemSnapDistance;
    case SNAP_3D_GRID: return config.gridSnapSize * 0.5;
    default: return 50;
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Apply the best available snap for the given cursor position.
 *
 * @param {number}     x              Cursor X in 3-D ground plane
 * @param {number}     z              Cursor Z in 3-D ground plane
 * @param {object}     scene          Immutable scene
 * @param {object}     config         Snap configuration (DEFAULT_SNAP_CONFIG)
 * @param {string}     excludeItemID  Item being dragged (exclude from item-snap)
 * @param {SnapState}  [snapState]    Optional state tracker for hysteresis
 * @returns {{ x, z, snapped, snapType, snapInfo }}
 */
export function applySnapping(
  x, z, scene,
  config = DEFAULT_SNAP_CONFIG,
  excludeItemID = null,
  snapState = null,
  dragContext = null,
) {
  if (!config.enabled) {
    return { x, z, snapped: false, snapType: null, snapInfo: null };
  }

  // Unpack optional drag context (bounding-box-aware snapping)
  const dragFP = dragContext?.footprint || null;
  const sceneGraph = dragContext?.sceneGraph || null;
  const dragRot = dragContext?.currentRotation || 0;

  // ── 1. Hysteresis: try to keep the current snap ──────────────────────────
  if (snapState && snapState.activeType !== SNAP_3D_NONE) {
    const maintained = _tryMaintainSnap(x, z, scene, config, snapState, dragFP);
    if (maintained) return maintained;
    snapState.update(SNAP_3D_NONE, null, null);
  }

  // ── 2. Collect candidates ────────────────────────────────────────────────
  const candidates = [];

  if (config.snapTypes[SNAP_3D_WALL]) {
    const walls = getWallsFromScene(scene);
    const wallSnap = snapToWalls(x, z, walls, config.wallSnapDistance, config.wallOffset || 0, dragFP);
    if (wallSnap) candidates.push(wallSnap);
  }

  if (config.snapTypes[SNAP_3D_ITEM]) {
    const items = getItemsFromScene(scene, excludeItemID);
    const itemSnap = snapToItems(x, z, items, config.itemSnapDistance, dragFP, sceneGraph, dragRot);
    if (itemSnap) candidates.push(itemSnap);
  }

  if (config.snapTypes[SNAP_3D_GRID]) {
    const gridSnap = snapToGrid(x, z, config.gridSnapSize, config.gridSnapMinDistance ?? 0);
    if (gridSnap) candidates.push(gridSnap);
  }

  if (candidates.length === 0) {
    if (snapState) snapState.update(SNAP_3D_NONE, null, null);
    return { x, z, snapped: false, snapType: null, snapInfo: null };
  }

  // ── 3. Score-based selection ─────────────────────────────────────────────
  //   score = normalizedDistance * 0.7 + priorityWeight * 0.3
  //   Lower is better.
  const PRIORITY_WEIGHT = {
    [SNAP_3D_WALL]: 0.15,
    [SNAP_3D_ITEM]: 0.45,
    [SNAP_3D_GRID]: 0.75,
  };

  let bestSnap = candidates[0];
  let bestScore = Infinity;

  for (const snap of candidates) {
    const normDist = snap.distance / _threshold(snap.type, config);
    const pw = PRIORITY_WEIGHT[snap.type] ?? 0.5;
    const score = normDist * 0.7 + pw * 0.3;
    if (score < bestScore) {
      bestScore = score;
      bestSnap = snap;
    }
  }

  // ── 4. Update state & return ─────────────────────────────────────────────
  if (snapState) {
    const target = bestSnap.type === SNAP_3D_WALL
      ? bestSnap.wall?.lineID
      : bestSnap.type === SNAP_3D_ITEM
        ? bestSnap.item?.itemID
        : null;
    snapState.update(bestSnap.type, target, bestSnap);
  }

  return {
    x: bestSnap.x,
    z: bestSnap.z,
    snapped: true,
    snapType: bestSnap.type,
    snapInfo: bestSnap,
  };
}

// ─── Visual indicators ────────────────────────────────────────────────────────

/**
 * Create a visual snap indicator (crosshair ring).
 */
export function createSnapIndicator(snapType, size = 30) {
  const group = new Three.Group();
  group.name = 'snapIndicator';

  const color = _snapColor(snapType);

  const material = new Three.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8,
    depthTest: false,
  });

  const geometry = new Three.RingGeometry(size * 0.7, size, 32);
  const ring = new Three.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 999;
  group.add(ring);

  const lineMaterial = new Three.LineBasicMaterial({ color, depthTest: false });

  const pts1 = [new Three.Vector3(-size, 0, 0), new Three.Vector3(size, 0, 0)];
  const pts2 = [new Three.Vector3(0, 0, -size), new Three.Vector3(0, 0, size)];

  const l1 = new Three.Line(new Three.BufferGeometry().setFromPoints(pts1), lineMaterial);
  const l2 = new Three.Line(new Three.BufferGeometry().setFromPoints(pts2), lineMaterial);
  l1.renderOrder = 999;
  l2.renderOrder = 999;
  group.add(l1, l2);

  return group;
}

/**
 * Update the colour of an existing snap indicator.
 */
export function updateSnapIndicatorColor(indicator, snapType) {
  const color = _snapColor(snapType);
  indicator.traverse((child) => {
    if (child.material) child.material.color.setHex(color);
  });
}

function _snapColor(snapType) {
  switch (snapType) {
    case SNAP_3D_WALL: return 0xff6600;   // Orange
    case SNAP_3D_ITEM: return 0x00ff00;   // Green
    case SNAP_3D_GRID:
    default:           return 0x00ffff;   // Cyan
  }
}
