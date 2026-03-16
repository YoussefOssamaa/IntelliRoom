/**
 * Shared geometry utilities for area/floor rendering.
 *
 * Used by area-factory.jsx (2D), area-factory-3d.js (3D), area.jsx (label),
 * and element-editor.jsx (properties panel).
 */

/**
 * Intersect two infinite 2D lines:
 *   Line 1: (px, py) + s·(dx, dy)
 *   Line 2: (qx, qy) + t·(ex, ey)
 * Returns the intersection point, or (qx, qy) if the lines are parallel.
 */
export function lineIntersect2D(px, py, dx, dy, qx, qy, ex, ey) {
  const cross = dx * ey - dy * ex;
  if (Math.abs(cross) < 1e-10) return { x: qx, y: qy }; // parallel fallback
  const s = ((qx - px) * ey - (qy - py) * ex) / cross;
  return { x: px + s * dx, y: py + s * dy };
}

/**
 * Compute the inset polygon for an area, moving each edge inward by half the
 * thickness of the wall that lies on that edge.
 *
 * Algorithm:
 *  1. For each consecutive pair of vertex IDs scan layer.lines to find the
 *     matching wall and read its `properties.thickness.length`.
 *  2. For each edge, compute the unit direction and the inward normal
 *     (the normal that points toward the polygon centroid).
 *  3. Offset each edge inward by the wall half-thickness.
 *  4. For each vertex, intersect the two adjacent offset lines — that
 *     intersection is the inset vertex.
 *
 * @param {Array<{x:number, y:number, id:string}>} verts  Ordered polygon vertices.
 * @param {Object}  layer              Immutable layer record (must have .lines and .vertices).
 * @param {number}  defaultHalfThick   Fallback half-thickness when no wall is found (default 10 cm).
 * @returns {Array<{x:number, y:number}>}  Inset polygon vertices.
 */
export function computeInsetPolygon(verts, layer, defaultHalfThick = 10) {
  const n = verts.length;
  if (n < 3) return verts.map(v => ({ x: v.x, y: v.y }));

  // Polygon centroid (used to determine inward direction for each edge normal)
  const cx = verts.reduce((s, v) => s + v.x, 0) / n;
  const cy = verts.reduce((s, v) => s + v.y, 0) / n;

  // --- Step 1: find half-thickness for each edge ---
  const halfThicks = [];
  for (let i = 0; i < n; i++) {
    const v0id = verts[i].id;
    const v1id = verts[(i + 1) % n].id;
    let halfThick = defaultHalfThick;

    layer.lines.forEach(line => {
      const lverts = line.vertices.toArray();
      if (
        (lverts[0] === v0id && lverts[1] === v1id) ||
        (lverts[1] === v0id && lverts[0] === v1id)
      ) {
        const t = line.getIn ? line.getIn(['properties', 'thickness', 'length']) : null;
        halfThick = (t != null ? t : defaultHalfThick * 2) / 2;
      }
    });
    halfThicks.push(halfThick);
  }

  // --- Step 2 & 3: build offset edge data ---
  const edgeData = [];
  for (let i = 0; i < n; i++) {
    const v0 = verts[i];
    const v1 = verts[(i + 1) % n];
    const dx = v1.x - v0.x;
    const dy = v1.y - v0.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1e-10) {
      edgeData.push({ ox: v0.x, oy: v0.y, ux: 1, uy: 0 });
      continue;
    }

    const ux = dx / len;
    const uy = dy / len;

    // Two candidate normals (left / right of edge direction)
    const n1x = -uy, n1y = ux;   // left (CCW 90°)
    const n2x =  uy, n2y = -ux;  // right (CW 90°)

    // Choose the normal that points toward the centroid
    const midX = (v0.x + v1.x) / 2;
    const midY = (v0.y + v1.y) / 2;
    const dot1 = n1x * (cx - midX) + n1y * (cy - midY);
    const nx = dot1 > 0 ? n1x : n2x;
    const ny = dot1 > 0 ? n1y : n2y;

    const h = halfThicks[i];
    edgeData.push({
      ox: v0.x + h * nx, // inward-offset start of edge
      oy: v0.y + h * ny,
      ux,
      uy,
    });
  }

  // --- Step 4: intersect adjacent offset lines to get inset vertices ---
  const insetVerts = [];
  for (let i = 0; i < n; i++) {
    const e1 = edgeData[(i - 1 + n) % n]; // previous edge ends at vertex i
    const e2 = edgeData[i];                // current edge starts at vertex i
    insetVerts.push(lineIntersect2D(e1.ox, e1.oy, e1.ux, e1.uy, e2.ox, e2.oy, e2.ux, e2.uy));
  }

  return insetVerts;
}

/**
 * Compute polygon area using the Shoelace formula.
 * Returns the absolute area in the polygon's coordinate units squared.
 *
 * @param {Array<{x:number, y:number}>} verts
 * @returns {number}
 */
export function polygonAreaShoelace(verts) {
  let sum = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Format an area measured in square centimetres as a human-readable string.
 * Shows m² for areas ≥ 0.1 m², cm² otherwise.
 *
 * @param {number} areaCm2
 * @returns {string}
 */
export function formatAreaM2(areaCm2) {
  const areaM2 = areaCm2 / 10000;
  return areaM2 >= 0.1
    ? `${areaM2.toFixed(2)} m\u00B2`
    : `${areaCm2.toFixed(0)} cm\u00B2`;
}
