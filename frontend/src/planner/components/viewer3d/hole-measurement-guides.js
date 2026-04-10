/**
 * Measurement guides for holes (doors / windows).
 *
 * Shows distance lines from hole edges to the inner wall edges (accounting
 * for wall thickness at connecting walls) when a hole is selected.
 *
 * Distances respect the project's measurement unit (scene.unit).
 * Guides are always-on-top overlay objects (depthTest: false, high renderOrder).
 *
 * Usage:
 *   const guides = new HoleMeasurementGuides(scene3D);
 *   guides.update(sceneState, sceneGraph, camera);
 *   guides.dispose();
 */

import * as Three from 'three';
import convert from 'convert-units';

const MIN_DISPLAY_DISTANCE = 30;  // cm — hide guide if shorter than this

// ─── Shared line material (reused) ────────────────────────────────────────────
let _lineMaterial = null;

function getLineMaterial() {
  if (!_lineMaterial) {
    _lineMaterial = new Three.LineBasicMaterial({
      color: 0x2563eb,
      depthTest: false,
      transparent: true,
      opacity: 1.0,
      linewidth: 1,
    });
  }
  return _lineMaterial;
}

// ─── Unit formatting ──────────────────────────────────────────────────────────

/**
 * Format a distance in centimetres to the target unit string.
 * Internal scene stores everything in cm.
 */
export function formatDistance(valueCM, unit) {
  if (!unit || unit === 'cm') return `${Math.round(valueCM)} cm`;
  try {
    const converted = convert(valueCM).from('cm').to(unit);
    if (unit === 'mm') return `${Math.round(converted)} mm`;
    return `${converted.toFixed(1)} ${unit}`;
  } catch {
    return `${Math.round(valueCM)} cm`;
  }
}

// ─── Label sprite ─────────────────────────────────────────────────────────────

/**
 * Create a billboard sprite label. sizeAttenuation: true → scales with world.
 */
export function createLabelSprite(text) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fontSize = 28 * dpr;
  const padding = 10 * dpr;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.font = `600 ${fontSize}px "Inter", "Segoe UI", sans-serif`;
  const metrics = ctx.measureText(text);
  const textW = metrics.width;

  canvas.width = Math.ceil(textW + padding * 2);
  canvas.height = Math.ceil(fontSize + padding * 1.6);
  const w = canvas.width;
  const h = canvas.height;

  // Rounded white background
  const r = 6 * dpr;
  ctx.fillStyle = '#ffffff';
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

  // Subtle border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#1e293b';
  ctx.font = `600 ${fontSize}px "Inter", "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
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
  const labelHeight = 12;
  sprite.scale.set(labelHeight * aspect, labelHeight, 1);
  sprite.renderOrder = 10001;
  return sprite;
}

// ─── End-cap tick marks ───────────────────────────────────────────────────────

function buildEndTicks(p1, p2, tickSize) {
  const dir = new Three.Vector3().subVectors(p2, p1).normalize();
  const perp = new Three.Vector3(-dir.z, 0, dir.x);
  if (perp.lengthSq() < 0.001) perp.set(0, 1, 0);
  const half = perp.clone().multiplyScalar(tickSize / 2);

  const pts = [
    p1.clone().sub(half), p1.clone().add(half),
    p2.clone().sub(half), p2.clone().add(half),
  ];

  const geom = new Three.BufferGeometry().setFromPoints(pts);
  geom.setIndex([0, 1, 2, 3]);
  const line = new Three.LineSegments(geom, getLineMaterial());
  line.renderOrder = 10000;
  return line;
}

// ─── Build a single measurement guide ─────────────────────────────────────────

export function buildGuide(p1, p2, text) {
  const group = new Three.Group();
  group.name = 'holeMeasurementGuide';
  group.renderOrder = 10000;

  const geom = new Three.BufferGeometry().setFromPoints([p1, p2]);
  const line = new Three.Line(geom, getLineMaterial());
  line.renderOrder = 10000;
  group.add(line);

  group.add(buildEndTicks(p1, p2, 6));

  const label = createLabelSprite(text);
  label.position.lerpVectors(p1, p2, 0.5);
  label.position.y += 3;
  group.add(label);

  return group;
}

// ─── Main class ───────────────────────────────────────────────────────────────

export default class HoleMeasurementGuides {
  constructor(scene3D) {
    this.scene = scene3D;
    this.root = new Three.Group();
    this.root.name = '__holeMeasurementGuides__';
    this.scene.add(this.root);
    this._guides = [];
    this._lastHoleID = null;
  }

  /**
   * @param {Immutable.Map} sceneState  Redux scene
   * @param {object}        sceneGraph  planData.sceneGraph
   * @param {Three.Camera}  camera      (reserved)
   */
  update(sceneState, sceneGraph, camera) {
    if (!sceneState) { this.clear(); return; }

    const layerID = sceneState.get('selectedLayer');
    const layer = sceneState.getIn(['layers', layerID]);
    if (!layer) { this.clear(); return; }

    const selectedHoles = layer.getIn(['selected', 'holes']);
    if (!selectedHoles || selectedHoles.size !== 1) { this.clear(); return; }

    const holeID = selectedHoles.first();
    const hole = layer.getIn(['holes', holeID]);
    if (!hole) { this.clear(); return; }

    this.clear();
    this._lastHoleID = holeID;

    // ── Parent wall ──
    const lineID = hole.get('line');
    const line = layer.getIn(['lines', lineID]);
    if (!line) return;

    const v0 = layer.getIn(['vertices', line.vertices.get(0)]);
    const v1 = layer.getIn(['vertices', line.vertices.get(1)]);
    if (!v0 || !v1) return;

    const x0 = v0.get('x'), y0 = v0.get('y');
    const x1 = v1.get('x'), y1 = v1.get('y');
    const wallLen = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    if (wallLen < 1) return;

    const unit = sceneState.get('unit') || 'cm';
    const offset = hole.get('offset') || 0;
    const holeWidth  = hole.getIn(['properties', 'width', 'length'])    || 80;
    const holeHeight = hole.getIn(['properties', 'height', 'length'])   || 210;
    const holeAlt    = hole.getIn(['properties', 'altitude', 'length']) || 0;
    const wallHeight = line.getIn(['properties', 'height', 'length'])   || 300;

    // Floor-slab reference height (same logic as scene-creator addHole)
    let slabH = 20;
    try {
      layer.get('areas').forEach(area => {
        const ft = area?.getIn(['properties', 'floorThickness', 'length']);
        if (ft) { slabH = ft; return false; }
      });
    } catch (_) { /* default */ }

    // Wall direction unit vector
    const dx = (x1 - x0) / wallLen;
    const dy = (y1 - y0) / wallLen;

    // Hole center and edges (plan-space)
    const holeCenterX = x0 + offset * wallLen * dx;
    const holeCenterY = y0 + offset * wallLen * dy;
    const halfW = holeWidth / 2;
    const holeLeftX  = holeCenterX - halfW * dx;
    const holeLeftY  = holeCenterY - halfW * dy;
    const holeRightX = holeCenterX + halfW * dx;
    const holeRightY = holeCenterY + halfW * dy;

    // ── Inner-edge offsets (wall thickness at connecting walls) ──
    const v0ID = line.vertices.get(0);
    const v1ID = line.vertices.get(1);
    const halfThick0 = this._vertexInset(layer, v0ID, lineID);
    const halfThick1 = this._vertexInset(layer, v1ID, lineID);

    const innerX0 = x0 + halfThick0 * dx;
    const innerY0 = y0 + halfThick0 * dy;
    const innerX1 = x1 - halfThick1 * dx;
    const innerY1 = y1 - halfThick1 * dy;

    const distLeft  = Math.sqrt((holeLeftX - innerX0) ** 2  + (holeLeftY - innerY0) ** 2);
    const distRight = Math.sqrt((holeRightX - innerX1) ** 2 + (holeRightY - innerY1) ** 2);

    const layerAlt = layer.get('altitude') || 0;
    // guideMidY: vertical midpoint of the opening in world space
    const guideMidY = layerAlt + slabH + holeAlt + holeHeight / 2;
    const distBottom = holeAlt;
    const distTop = wallHeight - holeAlt - holeHeight;

    const to3D = (px, py, alt) => new Three.Vector3(px, alt, -py);

    if (distLeft > MIN_DISPLAY_DISTANCE) {
      const p1 = to3D(holeLeftX, holeLeftY, guideMidY);
      const p2 = to3D(innerX0, innerY0, guideMidY);
      this._addGuide(buildGuide(p1, p2, formatDistance(distLeft, unit)));
    }

    if (distRight > MIN_DISPLAY_DISTANCE) {
      const p1 = to3D(holeRightX, holeRightY, guideMidY);
      const p2 = to3D(innerX1, innerY1, guideMidY);
      this._addGuide(buildGuide(p1, p2, formatDistance(distRight, unit)));
    }

    if (distBottom > MIN_DISPLAY_DISTANCE) {
      const p1 = to3D(holeCenterX, holeCenterY, layerAlt + slabH + holeAlt);
      const p2 = to3D(holeCenterX, holeCenterY, layerAlt + slabH);
      this._addGuide(buildGuide(p1, p2, formatDistance(distBottom, unit)));
    }

    if (distTop > MIN_DISPLAY_DISTANCE) {
      const p1 = to3D(holeCenterX, holeCenterY, layerAlt + slabH + holeAlt + holeHeight);
      const p2 = to3D(holeCenterX, holeCenterY, layerAlt + slabH + wallHeight);
      this._addGuide(buildGuide(p1, p2, formatDistance(distTop, unit)));
    }
  }

  /**
   * Inset at a shared vertex caused by a connecting wall's thickness.
   */
  _vertexInset(layer, vertexID, parentLineID) {
    const lines = layer.get('lines');
    let otherThickness = 0;

    lines.forEach((ln, lnID) => {
      if (lnID === parentLineID) return;
      const verts = ln.get('vertices');
      if (verts && (verts.get(0) === vertexID || verts.get(1) === vertexID)) {
        const t = ln.getIn(['properties', 'thickness', 'length']) || 20;
        if (t > otherThickness) otherThickness = t;
      }
    });

    return otherThickness > 0 ? otherThickness / 2 : 0;
  }

  _addGuide(guide) {
    this.root.add(guide);
    this._guides.push(guide);
  }

  clear() {
    for (const g of this._guides) {
      this.root.remove(g);
      g.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    }
    this._guides = [];
    this._lastHoleID = null;
  }

  dispose() {
    this.clear();
    if (this.scene) this.scene.remove(this.root);
    this.root = null;
  }
}
