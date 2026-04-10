'use strict';

/**
 * SelectionGizmoManager
 * ─────────────────────
 * Manages hover bounding boxes, selection bounding boxes, translation arrows
 * (axis-constrained gizmos) and a Y-rotation ring for the 3D viewer.
 *
 * Design goals
 *  • Clean, professional CAD-like feel.
 *  • Gizmos always render on top (depthTest disabled).
 *  • Constant screen-size scaling (unaffected by zoom).
 *  • Separate group from scene objects (easy to exclude from picking).
 *  • Reuses geometries / materials for performance.
 *  • Smooth fade-in for selection; instant disappear for hover on leave.
 */

import * as Three from 'three';

// ─── Visual configuration ─────────────────────────────────────────────────────

const HOVER_COLOR          = 0x64B5F6;   // Vivid light blue
const HOVER_OPACITY        = 0.7;
const HOVER_LINEWIDTH      = 2;           // Thicker hover outline

const SELECT_COLOR         = 0x2196F3;   // Solid blue
const SELECT_OPACITY       = 1.0;

const AXIS_COLORS = {
  x: 0xEE4444,   // Red
  y: 0x44CC44,   // Green
  z: 0x4488FF,   // Blue
};
const AXIS_HIGHLIGHT       = 0xFFFF44;   // Yellow when hovered / dragging

const ROTATION_COLOR       = 0xFF9900;   // Orange/gold

// Arrow geometry dimensions
const ARROW_SHAFT_RADIUS   = 1.2;
const ARROW_SHAFT_LENGTH   = 50;
const ARROW_HEAD_RADIUS    = 4;
const ARROW_HEAD_LENGTH    = 12;

// Rotation ring dimensions
const ROTATION_RADIUS      = 50;
const ROTATION_TUBE        = 1.5;

// Invisible hit-area multiplier (bigger = easier to click)
const HIT_SCALE            = 3;

// Animation
const FADE_IN_SPEED        = 8;    // opacity / second (select box fade-in)
const FADE_OUT_SPEED       = 20;   // opacity / second (select box fade-out)

// Screen-size scaling for gizmos
const SCREEN_FACTOR        = 0.0015;
const MIN_GIZMO_SCALE      = 0.3;
const MAX_GIZMO_SCALE      = 5.0;


// ─── Shared geometries (created once, reused across all gizmo instances) ──────

let _geo = null;

function getGeo() {
  if (_geo) return _geo;

  _geo = {};

  // Arrow shaft (extends along local +Y from origin)
  _geo.shaft = new Three.CylinderGeometry(
    ARROW_SHAFT_RADIUS, ARROW_SHAFT_RADIUS, ARROW_SHAFT_LENGTH, 8
  );
  _geo.shaft.translate(0, ARROW_SHAFT_LENGTH / 2, 0);

  // Arrow head (cone sitting on top of shaft)
  _geo.head = new Three.ConeGeometry(ARROW_HEAD_RADIUS, ARROW_HEAD_LENGTH, 12);
  _geo.head.translate(0, ARROW_SHAFT_LENGTH + ARROW_HEAD_LENGTH / 2, 0);

  // Rotation torus (horizontal ring in XZ)
  _geo.ring = new Three.TorusGeometry(ROTATION_RADIUS, ROTATION_TUBE, 8, 48);

  // Rotation indicator (small cone on ring edge)
  _geo.ringIndicator = new Three.ConeGeometry(3, 8, 8);

  // ── Hit-test volumes (invisible, bigger for easy picking) ──
  _geo.shaftHit = new Three.CylinderGeometry(
    ARROW_SHAFT_RADIUS * HIT_SCALE, ARROW_SHAFT_RADIUS * HIT_SCALE, ARROW_SHAFT_LENGTH, 6
  );
  _geo.shaftHit.translate(0, ARROW_SHAFT_LENGTH / 2, 0);

  _geo.headHit = new Three.ConeGeometry(
    ARROW_HEAD_RADIUS * HIT_SCALE, ARROW_HEAD_LENGTH * 1.5, 6
  );
  _geo.headHit.translate(0, ARROW_SHAFT_LENGTH + ARROW_HEAD_LENGTH / 2, 0);

  _geo.ringHit = new Three.TorusGeometry(
    ROTATION_RADIUS, ROTATION_TUBE * HIT_SCALE, 6, 24
  );

  return _geo;
}


// ─── Material helpers ─────────────────────────────────────────────────────────

function gizmoMat(color) {
  return new Three.MeshBasicMaterial({
    color,
    depthTest:  false,
    depthWrite: false,
    transparent: true,
    opacity: 1.0,
    side: Three.DoubleSide,
    toneMapped: false,
  });
}

function hitMat() {
  return new Three.MeshBasicMaterial({
    visible:    false,
    depthTest:  false,
    depthWrite: false,
    side: Three.DoubleSide,
  });
}


// ─── Arrow builder ────────────────────────────────────────────────────────────

function buildArrow(axis, color) {
  const geo  = getGeo();
  const grp  = new Three.Group();
  grp.name   = `arrow_${axis}`;

  // Visible parts
  const shaft = new Three.Mesh(geo.shaft, gizmoMat(color));
  const head  = new Three.Mesh(geo.head,  gizmoMat(color));
  shaft.renderOrder = 10000;
  head.renderOrder  = 10000;
  grp.add(shaft, head);

  // Hit parts (invisible, bigger)
  const shaftH = new Three.Mesh(geo.shaftHit, hitMat());
  const headH  = new Three.Mesh(geo.headHit,  hitMat());
  shaftH.userData = { gizmoType: 'translate', gizmoAxis: axis };
  headH.userData  = { gizmoType: 'translate', gizmoAxis: axis };
  grp.add(shaftH, headH);

  // Orient : CylinderGeometry extends along local Y
  if (axis === 'x') grp.rotation.z = -Math.PI / 2;
  if (axis === 'z') grp.rotation.x =  Math.PI / 2;

  grp.userData = { axis, visibleParts: [shaft, head] };
  return grp;
}


// ─── Rotation ring builder ────────────────────────────────────────────────────

function buildRotationRing() {
  const geo = getGeo();
  const grp = new Three.Group();
  grp.name  = 'rotationRing';

  // Main visible ring (lay flat in XZ)
  const ring = new Three.Mesh(geo.ring, gizmoMat(ROTATION_COLOR));
  ring.rotation.x = Math.PI / 2;
  ring.renderOrder = 10000;
  grp.add(ring);

  // Small directional indicator on the ring
  const indicator = new Three.Mesh(geo.ringIndicator, gizmoMat(ROTATION_COLOR));
  indicator.position.set(ROTATION_RADIUS, 0, 0);
  indicator.rotation.z = -Math.PI / 2;
  indicator.renderOrder = 10000;
  grp.add(indicator);

  // Hit ring
  const hitRing = new Three.Mesh(geo.ringHit, hitMat());
  hitRing.rotation.x = Math.PI / 2;
  hitRing.userData = { gizmoType: 'rotate', gizmoAxis: 'y' };
  grp.add(hitRing);

  grp.userData = { visibleParts: [ring, indicator] };
  return grp;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  SelectionGizmoManager
// ═══════════════════════════════════════════════════════════════════════════════

export default class SelectionGizmoManager {

  /**
   * @param {Three.Scene}           scene3D   – the Three.js scene
   * @param {Three.PerspectiveCamera} camera  – the viewer camera
   * @param {HTMLCanvasElement}      canvas   – renderer DOM element (for cursor)
   */
  constructor(scene3D, camera, canvas) {
    this.scene    = scene3D;
    this.camera   = camera;
    this.canvas   = canvas;

    // Root group – added to scene, separated from real objects
    this.root = new Three.Group();
    this.root.name = '__gizmos__';
    this.root.renderOrder = 5000;
    this.scene.add(this.root);

    // ── Hover state ───────────────────────────────────────────────────────────
    this.hoverTarget = null;   // Object3D (item/hole pivot) currently under cursor
    this.hoverInfo   = null;   // { elementType, elementID, layerID, … }
    this.hoverBox    = null;   // Three.BoxHelper

    // ── Selection state ───────────────────────────────────────────────────────
    this.selectedTarget = null;
    this.selectedInfo   = null;
    this.selectionBox   = null;
    this._selOpacity       = 0;
    this._selOpacityTarget = 0;

    // ── Translation gizmo ─────────────────────────────────────────────────────
    this.translationGroup = new Three.Group();
    this.translationGroup.name = 'translationGizmo';
    this.translationGroup.visible = false;
    this.root.add(this.translationGroup);

    this.arrowX = buildArrow('x', AXIS_COLORS.x);
    this.arrowY = buildArrow('y', AXIS_COLORS.y);
    this.arrowZ = buildArrow('z', AXIS_COLORS.z);
    this.translationGroup.add(this.arrowX, this.arrowY, this.arrowZ);

    // ── Rotation gizmo ────────────────────────────────────────────────────────
    this.rotationGroup = buildRotationRing();
    this.rotationGroup.visible = false;
    this.root.add(this.rotationGroup);

    // ── Drag state ────────────────────────────────────────────────────────────
    this.isDragging       = false;
    this.dragType         = null;  // 'translate' | 'rotate'
    this.dragAxis         = null;  // 'x' | 'y' | 'z'
    this._dragPlane       = new Three.Plane();
    this._dragStartWorld  = new Three.Vector3();
    this._dragObjectStart = new Three.Vector3();
    this._dragRotStart    = 0;
    this._dragAngleStart  = 0;

    // ── Highlight tracking ────────────────────────────────────────────────────
    this._highlightedParts = [];

    // ── Internal raycaster (gizmo picking only) ───────────────────────────────
    this._ray = new Three.Raycaster();

    // ── Clock for animation deltas ────────────────────────────────────────────
    this._clock = new Three.Clock(true);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  HOVER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Call every frame (or on mousemove) when in idle / view mode.
   *
   * @param {number}            mx  – NDC x  (-1 … 1)
   * @param {number}            my  – NDC y  (-1 … 1)
   * @param {Three.Object3D[]}  targets – objects to intersect (usually [planData.plan])
   * @param {Set|null}          hiddenMeshes – meshes hidden by wall vis manager
   * @param {Set|null}          hiddenHoleIDs – hole element IDs hidden with their parent wall
   */
  updateHover(mx, my, targets, hiddenMeshes, hiddenHoleIDs) {
    if (this.isDragging) return;

    this._ray.setFromCamera({ x: mx, y: my }, this.camera);

    let intersects;
    try {
      intersects = this._ray.intersectObjects(targets, true);
    } catch (_) {
      return;
    }

    // Filter out gizmo children, ghost / preview objects, hidden walls
    intersects = intersects.filter(hit => {
      let obj = hit.object;
      while (obj) {
        if (obj === this.root) return false;
        if (obj.userData && (obj.userData.isGhost || obj.userData.isPreview)) return false;
        if (hiddenMeshes && hiddenMeshes.has(obj)) return false;
        obj = obj.parent;
      }
      return true;
    });

    if (intersects.length === 0) {
      this._setHoverTarget(null, null);
      return;
    }

    // Walk up from the hit mesh to find an item / hole pivot with userData.elementType
    let elementPivot = null;
    let info = null;
    let obj = intersects[0].object;
    while (obj) {
      if (obj.userData &&
          (obj.userData.elementType === 'items' || obj.userData.elementType === 'holes')) {
        elementPivot = obj;
        info = obj.userData;
        break;
      }
      obj = obj.parent;
    }

    // Don't show hover on the already-selected element
    if (elementPivot && elementPivot === this.selectedTarget) {
      this._setHoverTarget(null, null);
      return;
    }

    // Don't show hover on holes whose parent wall is hidden
    if (elementPivot && info && info.elementType === 'holes' && hiddenHoleIDs && hiddenHoleIDs.size > 0) {
      if (hiddenHoleIDs.has(info.elementID)) {
        this._setHoverTarget(null, null);
        return;
      }
    }

    this._setHoverTarget(elementPivot, info);
  }

  /** @private */
  _setHoverTarget(mesh, info) {
    if (mesh === this.hoverTarget) return;

    // Instantly remove old hover box (spec: "disappear immediately on leave")
    if (this.hoverBox) {
      this.root.remove(this.hoverBox);
      this.hoverBox.geometry?.dispose();
      this.hoverBox.material?.dispose();
      this.hoverBox = null;
    }

    this.hoverTarget = mesh;
    this.hoverInfo   = info;

    if (mesh) {
      this.hoverBox = new Three.BoxHelper(mesh, HOVER_COLOR);
      this.hoverBox.material.transparent = true;
      this.hoverBox.material.opacity     = HOVER_OPACITY;
      this.hoverBox.material.depthTest   = false;
      this.hoverBox.material.toneMapped  = false;
      this.hoverBox.material.linewidth   = HOVER_LINEWIDTH;
      this.hoverBox.renderOrder          = 999;
      this.root.add(this.hoverBox);
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Synchronise gizmos with current Redux selection state.
   * Call after every scene state change (in componentDidUpdate).
   *
   * @param {Object} sceneState  – Immutable scene Map
   * @param {Object} sceneGraph  – planData.sceneGraph
   */
  updateSelection(sceneState, sceneGraph) {
    if (!sceneState || !sceneGraph) return;

    const layers = sceneState.get('layers');
    let foundMesh = null;
    let foundInfo = null;

    layers.forEach((layer, layerID) => {
      if (foundMesh) return;
      const lg = sceneGraph.layers[layerID];
      if (!lg) return;

      // Items
      if (layer.get('items')) {
        layer.get('items').forEach((item, itemID) => {
          if (foundMesh) return;
          if (!item.selected) return;
          const mesh = lg.items[itemID];
          if (!mesh) return;
          foundMesh = mesh;
          foundInfo = {
            elementType: 'items',
            elementID:   itemID,
            layerID,
            catalogType: item.type || '',
          };
        });
      }

      // Holes (doors / windows)
      if (layer.get('holes')) {
        layer.get('holes').forEach((hole, holeID) => {
          if (foundMesh) return;
          if (!hole.selected) return;
          const mesh = lg.holes[holeID];
          if (!mesh) return;

          const typeLower = (hole.type || '').toLowerCase();
          foundMesh = mesh;
          foundInfo = {
            elementType: 'holes',
            elementID:   holeID,
            layerID,
            catalogType: hole.type || '',
            holeType:    typeLower.includes('window') ? 'window'
                       : typeLower.includes('door')   ? 'door'
                       : 'hole',
            holeLine:    hole.line,
          };
        });
      }
    });

    this._setSelection(foundMesh, foundInfo);
  }

  /** @private */
  _setSelection(mesh, info) {
    if (mesh === this.selectedTarget && mesh !== null) {
      // Same element – just refresh info & gizmo position
      this.selectedInfo = info;
      if (mesh) this._positionGizmos(mesh);
      return;
    }

    // ── Tear down old selection visuals immediately ──
    this._disposeSelectionBox();

    this.selectedTarget = mesh;
    this.selectedInfo   = info;

    if (mesh) {
      // Selection bounding box
      this.selectionBox = new Three.BoxHelper(mesh, SELECT_COLOR);
      this.selectionBox.material.transparent = true;
      this.selectionBox.material.opacity     = 0;      // will fade in
      this.selectionBox.material.depthTest   = false;
      this.selectionBox.material.toneMapped  = false;
      this.selectionBox.material.linewidth   = 2;
      this.selectionBox.renderOrder          = 999;
      this.root.add(this.selectionBox);

      this._selOpacity       = 0;
      this._selOpacityTarget = SELECT_OPACITY;

      this._positionGizmos(mesh);
      this._updateGizmoVisibility();

      // Remove hover on the newly selected mesh
      if (this.hoverTarget === mesh) {
        this._setHoverTarget(null, null);
      }
    } else {
      this._selOpacityTarget = 0;
      this.translationGroup.visible = false;
      this.rotationGroup.visible    = false;
    }
  }

  /** Reposition translation + rotation gizmos at the bounding box centre. */
  _positionGizmos(mesh) {
    const box    = new Three.Box3().setFromObject(mesh);
    const center = box.getCenter(new Three.Vector3());

    this.translationGroup.position.copy(center);
    this.rotationGroup.position.copy(center);
  }

  /** Show / hide arrows + ring based on element type. */
  _updateGizmoVisibility() {
    const info = this.selectedInfo;
    const has  = !!this.selectedTarget;

    // Translation arrows: always shown when something is selected
    this.translationGroup.visible = has;

    // Rotation ring: items only (NOT doors / windows)
    if (has && info) {
      this.rotationGroup.visible = (info.elementType !== 'holes');
    } else {
      this.rotationGroup.visible = false;
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  GIZMO MOUSE INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Call from mouseDown. Returns **true** if a gizmo was hit (caller should
   * consume the event and disable OrbitControls).
   */
  handleMouseDown(mx, my) {
    if (!this.selectedTarget) return false;

    this._ray.setFromCamera({ x: mx, y: my }, this.camera);

    const hitTargets = [];
    if (this.translationGroup.visible) hitTargets.push(this.translationGroup);
    if (this.rotationGroup.visible)    hitTargets.push(this.rotationGroup);
    if (hitTargets.length === 0) return false;

    const hits = this._ray.intersectObjects(hitTargets, true);
    if (hits.length === 0) return false;

    // Walk up from hit to find gizmo metadata
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.gizmoType) {
          this.isDragging = true;
          this.dragType   = obj.userData.gizmoType;
          this.dragAxis   = obj.userData.gizmoAxis;

          this._dragObjectStart.copy(this.selectedTarget.position);
          this._dragRotStart = this.selectedTarget.rotation.y;

          if (this.dragType === 'translate') {
            this._setupTranslatePlane(this.dragAxis, hit.point);
          } else {
            this._setupRotatePlane(hit.point);
          }

          this._highlightAxis(this.dragAxis, this.dragType);
          return true;
        }
        obj = obj.parent;
      }
    }
    return false;
  }

  /** @private  Build the drag-constraint plane for axis translation. */
  _setupTranslatePlane(axis, hitPoint) {
    const axisVec = new Three.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0,
    );

    const center  = this.translationGroup.position;
    const viewDir = new Three.Vector3().subVectors(this.camera.position, center).normalize();

    // Plane normal = perpendicular to axis and as parallel to view as possible
    let normal = new Three.Vector3().crossVectors(axisVec, viewDir);
    if (normal.lengthSq() < 1e-6) {
      // Degenerate: camera looks along axis → use camera up
      normal.crossVectors(axisVec, this.camera.up);
    }
    normal.crossVectors(normal, axisVec).normalize();

    // Flip normal toward camera so ray intersection works
    if (normal.dot(viewDir) < 0) normal.negate();

    this._dragPlane.setFromNormalAndCoplanarPoint(normal, center);

    // Record the starting point on the plane
    this._ray.ray.intersectPlane(this._dragPlane, this._dragStartWorld);
  }

  /** @private  Horizontal plane through object centre for rotation. */
  _setupRotatePlane(_hitPoint) {
    const center = this.rotationGroup.position;
    this._dragPlane.setFromNormalAndCoplanarPoint(
      new Three.Vector3(0, 1, 0),
      center,
    );

    const pt = new Three.Vector3();
    this._ray.ray.intersectPlane(this._dragPlane, pt);
    this._dragAngleStart = Math.atan2(pt.z - center.z, pt.x - center.x);
  }

  /**
   * Call from mouseMove while dragging.
   * Returns a result object describing the delta, or null.
   */
  handleMouseMove(mx, my) {
    if (!this.isDragging || !this.selectedTarget) return null;
    this._ray.setFromCamera({ x: mx, y: my }, this.camera);

    return this.dragType === 'translate'
      ? this._handleTranslateMove()
      : this._handleRotateMove();
  }

  /** @private */
  _handleTranslateMove() {
    const pt = new Three.Vector3();
    if (!this._ray.ray.intersectPlane(this._dragPlane, pt)) return null;

    const delta = pt.sub(this._dragStartWorld);

    // Project onto axis
    const axisVec = new Three.Vector3(
      this.dragAxis === 'x' ? 1 : 0,
      this.dragAxis === 'y' ? 1 : 0,
      this.dragAxis === 'z' ? 1 : 0,
    );
    const projected = axisVec.multiplyScalar(delta.dot(axisVec));

    // Move mesh
    const newPos = this._dragObjectStart.clone().add(projected);
    this.selectedTarget.position.copy(newPos);

    // Keep gizmos centred
    this._positionGizmos(this.selectedTarget);

    return {
      type: 'translate',
      axis: this.dragAxis,
      position: newPos.clone(),
      delta: projected.clone(),
    };
  }

  /** @private */
  _handleRotateMove() {
    const pt = new Three.Vector3();
    if (!this._ray.ray.intersectPlane(this._dragPlane, pt)) return null;

    const center = this.rotationGroup.position;
    const angle  = Math.atan2(pt.z - center.z, pt.x - center.x);
    const dAngle = angle - this._dragAngleStart;
    const newRot = this._dragRotStart - dAngle;

    this.selectedTarget.rotation.y = newRot;

    return {
      type: 'rotate',
      rotation: newRot,
      angleDelta: dAngle,
    };
  }

  /**
   * Call from mouseUp to end a gizmo drag.
   * Returns a result object for committing to Redux, or null.
   */
  handleMouseUp() {
    if (!this.isDragging) return null;

    const result = {
      type:          this.dragType,
      axis:          this.dragAxis,
      elementInfo:   this.selectedInfo,
      position:      this.selectedTarget ? this.selectedTarget.position.clone() : null,
      rotation:      this.selectedTarget ? this.selectedTarget.rotation.y : null,
      startPosition: this._dragObjectStart.clone(),
      startRotation: this._dragRotStart,
    };

    this.isDragging = false;
    this.dragType   = null;
    this.dragAxis   = null;
    this._clearHighlight();

    // Re-centre gizmos at updated position
    if (this.selectedTarget) this._positionGizmos(this.selectedTarget);

    return result;
  }

  /** Abort gizmo drag, reverting the mesh to its original position/rotation. */
  cancelDrag() {
    if (!this.isDragging) return;
    if (this.selectedTarget) {
      this.selectedTarget.position.copy(this._dragObjectStart);
      this.selectedTarget.rotation.y = this._dragRotStart;
      this._positionGizmos(this.selectedTarget);
    }
    this.isDragging = false;
    this.dragType   = null;
    this.dragAxis   = null;
    this._clearHighlight();
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  GIZMO ARROW HOVER HIGHLIGHT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Highlight gizmo arrows when the cursor hovers over them.
   * Call from mouseMove when NOT dragging.
   */
  highlightGizmoOnHover(mx, my) {
    if (this.isDragging || !this.selectedTarget) {
      this._clearHighlight();
      return;
    }

    this._ray.setFromCamera({ x: mx, y: my }, this.camera);

    const targets = [];
    if (this.translationGroup.visible) targets.push(this.translationGroup);
    if (this.rotationGroup.visible)    targets.push(this.rotationGroup);
    if (targets.length === 0) { this._clearHighlight(); return; }

    const hits = this._ray.intersectObjects(targets, true);
    if (hits.length === 0) { this._clearHighlight(); return; }

    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.gizmoType) {
          this._highlightAxis(obj.userData.gizmoAxis, obj.userData.gizmoType);
          return;
        }
        obj = obj.parent;
      }
    }
    this._clearHighlight();
  }

  /** @private  Colour the visible parts of a gizmo axis yellow. */
  _highlightAxis(axis, type) {
    this._clearHighlight();

    let grp;
    if (type === 'translate') {
      if (axis === 'x')      grp = this.arrowX;
      else if (axis === 'y') grp = this.arrowY;
      else                   grp = this.arrowZ;
    } else {
      grp = this.rotationGroup;
    }
    if (!grp) return;

    const parts = grp.userData.visibleParts || [];
    parts.forEach(m => {
      if (m.material) {
        m._savedColor = m.material.color.getHex();
        m.material.color.setHex(AXIS_HIGHLIGHT);
      }
    });
    this._highlightedParts = parts;
  }

  /** @private  Restore original colours. */
  _clearHighlight() {
    this._highlightedParts.forEach(m => {
      if (m.material && m._savedColor !== undefined) {
        m.material.color.setHex(m._savedColor);
        delete m._savedColor;
      }
    });
    this._highlightedParts = [];
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  CURSOR HELPER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Returns true if the mouse is currently over a gizmo element.
   * Useful for changing the CSS cursor.
   */
  isOverGizmo(mx, my) {
    if (!this.selectedTarget) return false;

    this._ray.setFromCamera({ x: mx, y: my }, this.camera);

    const targets = [];
    if (this.translationGroup.visible) targets.push(this.translationGroup);
    if (this.rotationGroup.visible)    targets.push(this.rotationGroup);
    if (targets.length === 0) return false;

    return this._ray.intersectObjects(targets, true).length > 0;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER-LOOP UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Call once per frame inside the render loop.
   * Handles fade animations and screen-size scaling.
   */
  update() {
    const dt = Math.min(this._clock.getDelta(), 0.1); // cap wild spikes

    // ── Hover box sync ──
    if (this.hoverBox) {
      this.hoverBox.update();
    }

    // ── Selection box fade ──
    if (this.selectionBox) {
      const speed = (this._selOpacityTarget > this._selOpacity)
        ? FADE_IN_SPEED : FADE_OUT_SPEED;
      this._selOpacity = approach(this._selOpacity, this._selOpacityTarget, speed * dt);
      this.selectionBox.material.opacity = this._selOpacity;
      this.selectionBox.update();

      // Dispose once fully invisible and target is 0
      if (this._selOpacityTarget === 0 && this._selOpacity < 0.01 && !this.selectedTarget) {
        this._disposeSelectionBox();
      }
    }

    // ── Gizmo constant screen-size ──
    if (this.selectedTarget && this.translationGroup.visible) {
      const dist  = this.camera.position.distanceTo(this.translationGroup.position);
      const scale = clamp(dist * SCREEN_FACTOR, MIN_GIZMO_SCALE, MAX_GIZMO_SCALE);
      this.translationGroup.scale.setScalar(scale);
      this.rotationGroup.scale.setScalar(scale);
    }

    // ── Gizmo opacity (fade gizmos in with selection box) ──
    if (this.translationGroup.visible) {
      const targetOp = this._selOpacityTarget > 0 ? 1 : 0;
      setGroupOpacity(this.translationGroup, approach(
        getGroupOpacity(this.translationGroup), targetOp, FADE_IN_SPEED * dt));
    }
    if (this.rotationGroup.visible) {
      const targetOp = this._selOpacityTarget > 0 ? 1 : 0;
      setGroupOpacity(this.rotationGroup, approach(
        getGroupOpacity(this.rotationGroup), targetOp, FADE_IN_SPEED * dt));
    }
  }


  /** Immediately remove and dispose the selection bounding box. */
  _disposeSelectionBox() {
    if (this.selectionBox) {
      this.root.remove(this.selectionBox);
      this.selectionBox.geometry?.dispose();
      this.selectionBox.material?.dispose();
      this.selectionBox = null;
    }
    this._selOpacity = 0;
    this._selOpacityTarget = 0;
  }

  /** Force-clear both hover and selection visuals (call on mode / scene change). */
  clearAll() {
    this._setHoverTarget(null, null);
    this._disposeSelectionBox();
    this.selectedTarget = null;
    this.selectedInfo   = null;
    this.translationGroup.visible = false;
    this.rotationGroup.visible    = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DISPOSAL
  // ═══════════════════════════════════════════════════════════════════════════

  dispose() {
    // Remove hover & selection helpers
    if (this.hoverBox) {
      this.root.remove(this.hoverBox);
      this.hoverBox.geometry?.dispose();
      this.hoverBox.material?.dispose();
    }
    if (this.selectionBox) {
      this.root.remove(this.selectionBox);
      this.selectionBox.geometry?.dispose();
      this.selectionBox.material?.dispose();
    }

    // Dispose gizmo materials (geometries are shared / reused)
    this.root.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.dispose();
      }
    });

    this.scene.remove(this.root);
  }
}


// ─── Utility ──────────────────────────────────────────────────────────────────

function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Set opacity on all visible gizmo materials inside a group. */
function setGroupOpacity(group, opacity) {
  group.traverse(child => {
    if (child.isMesh && child.material && child.material.visible !== false) {
      child.material.opacity = opacity;
    }
  });
  group._cachedOpacity = opacity;
}

function getGroupOpacity(group) {
  return group._cachedOpacity ?? 1;
}
