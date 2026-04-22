import {
  TextureLoader,
  Mesh,
  RepeatWrapping,
  MeshBasicMaterial,
  SRGBColorSpace,
  Group,
  Color,
  LineSegments,
  LineBasicMaterial,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  FrontSide
} from 'three';
import {verticesDistance} from '../../utils/geometry';
import * as SharedStyle from '../../shared-style';
import { calculateWallMiterOffsets } from './wall-utils';

// Texture cache to avoid reloading
const textureCache = new Map();

/**
 * Create edge lines for the outer wall boundary only (not internal segment edges)
 * This creates edges for: outer perimeter of wall + hole perimeters
 */
function createWallBoundaryEdges(distance, height, thickness, miter0, miter1, holes) {
  const halfThickness = thickness / 2;
  const halfDistance = distance / 2;
  const vertices = [];
  
  // Calculate mitered X positions at start and end
  let x0_front = -halfDistance;
  let x0_back = -halfDistance;
  let x1_front = halfDistance;
  let x1_back = halfDistance;
  
  if (miter0.extend > 0) {
    if (miter0.side > 0) {
      x0_front = -halfDistance - miter0.extend;
      x0_back = -halfDistance + miter0.extend;
    } else {
      x0_back = -halfDistance - miter0.extend;
      x0_front = -halfDistance + miter0.extend;
    }
  }
  
  if (miter1.extend > 0) {
    if (miter1.side > 0) {
      x1_front = halfDistance + miter1.extend;
      x1_back = halfDistance - miter1.extend;
    } else {
      x1_back = halfDistance + miter1.extend;
      x1_front = halfDistance - miter1.extend;
    }
  }
  
  // Helper to add a line segment
  const addLine = (x1, y1, z1, x2, y2, z2) => {
    vertices.push(x1, y1, z1, x2, y2, z2);
  };
  
  // Front face (+Z) outer boundary - 4 edges forming rectangle
  addLine(x0_front, 0, halfThickness, x1_front, 0, halfThickness); // bottom
  addLine(x1_front, 0, halfThickness, x1_front, height, halfThickness); // right
  addLine(x1_front, height, halfThickness, x0_front, height, halfThickness); // top
  addLine(x0_front, height, halfThickness, x0_front, 0, halfThickness); // left
  
  // Back face (-Z) outer boundary - 4 edges
  addLine(x0_back, 0, -halfThickness, x1_back, 0, -halfThickness); // bottom
  addLine(x1_back, 0, -halfThickness, x1_back, height, -halfThickness); // right
  addLine(x1_back, height, -halfThickness, x0_back, height, -halfThickness); // top
  addLine(x0_back, height, -halfThickness, x0_back, 0, -halfThickness); // left
  
  // Connecting edges between front and back (corners) - 4 vertical edges
  addLine(x0_front, 0, halfThickness, x0_back, 0, -halfThickness); // bottom-left
  addLine(x1_front, 0, halfThickness, x1_back, 0, -halfThickness); // bottom-right
  addLine(x1_front, height, halfThickness, x1_back, height, -halfThickness); // top-right
  addLine(x0_front, height, halfThickness, x0_back, height, -halfThickness); // top-left
  
  // Add hole perimeter edges
  holes.forEach(hole => {
    const hx = hole.x - halfDistance; // Convert to centered coordinates
    const hy = hole.y;
    const hw = hole.width;
    const hh = hole.height;
    
    // Front face hole edges
    addLine(hx, hy, halfThickness, hx + hw, hy, halfThickness); // bottom
    addLine(hx + hw, hy, halfThickness, hx + hw, hy + hh, halfThickness); // right
    addLine(hx + hw, hy + hh, halfThickness, hx, hy + hh, halfThickness); // top
    addLine(hx, hy + hh, halfThickness, hx, hy, halfThickness); // left
    
    // Back face hole edges
    addLine(hx, hy, -halfThickness, hx + hw, hy, -halfThickness); // bottom
    addLine(hx + hw, hy, -halfThickness, hx + hw, hy + hh, -halfThickness); // right
    addLine(hx + hw, hy + hh, -halfThickness, hx, hy + hh, -halfThickness); // top
    addLine(hx, hy + hh, -halfThickness, hx, hy, -halfThickness); // left
    
    // Hole depth edges (connecting front and back)
    addLine(hx, hy, halfThickness, hx, hy, -halfThickness); // bottom-left
    addLine(hx + hw, hy, halfThickness, hx + hw, hy, -halfThickness); // bottom-right
    addLine(hx + hw, hy + hh, halfThickness, hx + hw, hy + hh, -halfThickness); // top-right
    addLine(hx, hy + hh, halfThickness, hx, hy + hh, -halfThickness); // top-left
  });
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  return geometry;
}

/**
 * Create a single wall segment using BoxGeometry
 * @param {number} width - segment width (along wall)
 * @param {number} height - segment height
 * @param {number} thickness - wall thickness
 * @param {number} offsetX - X offset from wall start (left edge of segment)
 * @param {number} offsetY - Y offset from wall bottom
 * @param {Object} miter0 - miter at start (only applied if segment touches start)
 * @param {Object} miter1 - miter at end (only applied if segment touches end)
 * @param {number} wallLength - total wall length for UV and miter calculations
 * @param {number} wallHeight - total wall height for UV calculations
 */
function createWallSegment(width, height, thickness, offsetX, offsetY, miter0, miter1, wallLength, wallHeight) {
  const geometry = new BoxGeometry(width, height, thickness);
  
  // BoxGeometry creates faces in order: +X, -X, +Y, -Y, +Z, -Z
  // We need to remap to: [0]=exterior(+Z), [1]=interior(-Z), [2]=top(+Y), [3]=bottom(-Y), [4]=right(+X), [5]=left(-X)
  geometry.clearGroups();
  
  // Each face of BoxGeometry has 6 indices (2 triangles)
  // Standard BoxGeometry group order: +X(0-5), -X(6-11), +Y(12-17), -Y(18-23), +Z(24-29), -Z(30-35)
  geometry.addGroup(24, 6, 0);  // +Z → exterior (material 0)
  geometry.addGroup(30, 6, 1);  // -Z → interior (material 1)
  geometry.addGroup(12, 6, 2);  // +Y → top (material 2)
  geometry.addGroup(18, 6, 3);  // -Y → bottom (material 3)
  geometry.addGroup(0, 6, 4);   // +X → right end (material 4)
  geometry.addGroup(6, 6, 5);   // -X → left end (material 5)
  
  // Fix UV coordinates for proper texture mapping across entire wall
  // UVs should be based on position within full wall, not just this segment
  const uvs = geometry.attributes.uv;
  const positions = geometry.attributes.position;
  const halfWidth = width / 2;
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    // Calculate absolute position within the wall
    const absX = offsetX + x + halfWidth; // Convert local X to wall X (0 to wallLength)
    const absY = offsetY + y + height / 2; // Convert local Y to wall Y (0 to wallHeight)
    
    // Determine which face this vertex belongs to based on BoxGeometry vertex order
    // BoxGeometry vertex order: 24 vertices total
    // +X face: 0-3, -X face: 4-7, +Y face: 8-11, -Y face: 12-15, +Z face: 16-19, -Z face: 20-23
    const faceIndex = Math.floor(i / 4);
    
    if (faceIndex === 4 || faceIndex === 5) {
      // +Z (exterior) or -Z (interior) faces - main textured faces
      // UV based on position within full wall
      const u = absX / wallLength;
      const v = absY / wallHeight;
      uvs.setXY(i, u, v);
    }
    // Other faces (top, bottom, ends) keep default UVs since they're not textured
  }
  
  uvs.needsUpdate = true;
  
  // Apply miter by shearing vertices at wall boundaries
  const segmentLeft = offsetX;
  const segmentRight = offsetX + width;
  const epsilon = 0.01;
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    
    // Check if this vertex is at the wall's start boundary
    if (Math.abs(segmentLeft) < epsilon && Math.abs(x + halfWidth) < epsilon) {
      // Vertex at left edge of segment, which is at wall start
      if (miter0.extend > 0) {
        const t = (z + thickness / 2) / thickness; // 0 at back, 1 at front
        const shear = miter0.side < 0 ? -miter0.extend + (2 * miter0.extend * t) :
          miter0.extend - (2 * miter0.extend * t);
        positions.setX(i, x + shear);
      }
    }
    
    // Check if this vertex is at the wall's end boundary
    if (Math.abs(segmentRight - wallLength) < epsilon && Math.abs(x - halfWidth) < epsilon) {
      if (miter1.extend > 0) {
        const t = (z + thickness / 2) / thickness;
        const shear = miter1.side < 0 ?
          miter1.extend - (2 * miter1.extend * t) :
          -miter1.extend + (2 * miter1.extend * t);
        positions.setX(i, x + shear);
      }
    }
  }
  
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  
  // Position the segment (offsetX is left edge, so add halfWidth to get center)
  geometry.translate(offsetX + halfWidth, offsetY + height / 2, 0);
  
  return geometry;
}

/**
 * Merge multiple geometries into one for better performance
 */
function mergeSegmentGeometries(segments) {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];
  
  // Count total vertices and indices
  let totalVertices = 0;
  let totalIndices = 0;
  segments.forEach(geo => {
    totalVertices += geo.attributes.position.count;
    totalIndices += geo.index ? geo.index.count : 0;
  });
  
  // Create merged arrays
  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const indices = [];
  const groups = [];
  
  let vertexOffset = 0;
  let indexOffset = 0;
  
  segments.forEach(geo => {
    const posArray = geo.attributes.position.array;
    const normArray = geo.attributes.normal.array;
    const uvArray = geo.attributes.uv ? geo.attributes.uv.array : null;
    
    // Copy positions
    positions.set(posArray, vertexOffset * 3);
    normals.set(normArray, vertexOffset * 3);
    if (uvArray) uvs.set(uvArray, vertexOffset * 2);
    
    // Copy indices with offset
    if (geo.index) {
      const indexArray = geo.index.array;
      for (let i = 0; i < indexArray.length; i++) {
        indices.push(indexArray[i] + vertexOffset);
      }
    }
    
    // Copy groups with offset
    geo.groups.forEach(g => {
      groups.push({
        start: g.start + indexOffset,
        count: g.count,
        materialIndex: g.materialIndex
      });
    });
    
    vertexOffset += geo.attributes.position.count;
    indexOffset += geo.index ? geo.index.count : 0;
  });
  
  // Create merged geometry
  const merged = new BufferGeometry();
  merged.setAttribute('position', new Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  
  // Consolidate groups by material index
  const materialGroups = new Map();
  groups.forEach(g => {
    if (!materialGroups.has(g.materialIndex)) {
      materialGroups.set(g.materialIndex, []);
    }
    materialGroups.get(g.materialIndex).push(g);
  });
  
  // Add consolidated groups
  materialGroups.forEach((groupList, matIndex) => {
    groupList.forEach(g => {
      merged.addGroup(g.start, g.count, matIndex);
    });
  });
  
  return merged;
}

/**
 * Build wall geometry with holes using box segments
 * Creates separate box segments around each hole
 */
function buildWallWithHoles(distance, height, thickness, miter0, miter1, holes) {
  const segments = [];
  
  if (holes.length === 0) {
    // No holes - single segment (offsetX=0 is left edge)
    const geo = createWallSegment(distance, height, thickness, 0, 0, miter0, miter1, distance, height);
    geo.translate(-distance / 2, 0, 0); // Center on origin
    return geo;
  }
  
  // Sort holes by X position
  const sortedHoles = [...holes].sort((a, b) => a.x - b.x);
  
  // Create segments around holes
  // Strategy: divide wall into horizontal strips, then subdivide around holes
  
  // Find all unique Y boundaries
  const yBoundaries = new Set([0, height]);
  sortedHoles.forEach(hole => {
    yBoundaries.add(hole.y);
    yBoundaries.add(hole.y + hole.height);
  });
  const yLevels = [...yBoundaries].sort((a, b) => a - b);
  
  // For each horizontal strip
  for (let i = 0; i < yLevels.length - 1; i++) {
    const stripBottom = yLevels[i];
    const stripTop = yLevels[i + 1];
    const stripHeight = stripTop - stripBottom;
    
    if (stripHeight <= 0) continue;
    
    // Find holes that intersect this strip
    const stripHoles = sortedHoles.filter(hole => 
      hole.y < stripTop && hole.y + hole.height > stripBottom
    );
    
    if (stripHoles.length === 0) {
      // No holes in this strip - full width segment
      const applyMiter0 = stripBottom === 0 || stripTop === height ? miter0 : { extend: 0, side: 0 };
      const applyMiter1 = stripBottom === 0 || stripTop === height ? miter1 : { extend: 0, side: 0 };
      // offsetX=0 is left edge of wall
      segments.push(createWallSegment(distance, stripHeight, thickness, 0, stripBottom, applyMiter0, applyMiter1, distance, height));
    } else {
      // Create segments between and around holes
      let currentX = 0;
      
      stripHoles.forEach(hole => {
        // Segment before this hole
        if (hole.x > currentX) {
          const segWidth = hole.x - currentX;
          const applyMiter0 = currentX === 0 ? miter0 : { extend: 0, side: 0 };
          // offsetX is left edge of segment
          segments.push(createWallSegment(segWidth, stripHeight, thickness, currentX, stripBottom, applyMiter0, { extend: 0, side: 0 }, distance, height));
        }
        currentX = hole.x + hole.width;
      });
      
      // Segment after last hole
      if (currentX < distance) {
        const segWidth = distance - currentX;
        const applyMiter1 = currentX + segWidth >= distance ? miter1 : { extend: 0, side: 0 };
        // offsetX is left edge of segment
        segments.push(createWallSegment(segWidth, stripHeight, thickness, currentX, stripBottom, { extend: 0, side: 0 }, applyMiter1, distance, height));
      }
    }
  }
  
  // Center the geometry
  segments.forEach(geo => geo.translate(-distance / 2, 0, 0));
  
  // Merge all segments
  return mergeSegmentGeometries(segments);
}

/**
 * Load texture with caching
 */
function loadWallTexture(textureDef, length, height) {
  return new Promise(resolve => {
    if (!textureDef || !textureDef.uri) return resolve(null);
    
    const cacheKey = textureDef.uri;
    
    const applyTextureSettings = (tex) => {
      const clonedTex = tex.clone();
      clonedTex.wrapS = RepeatWrapping;
      clonedTex.wrapT = RepeatWrapping;
      const lengthScale = textureDef.lengthRepeatScale || 0.01;
      const heightScale = textureDef.heightRepeatScale || 0.01;
      clonedTex.repeat.set(length * lengthScale, height * heightScale);
      if (clonedTex.colorSpace !== undefined) clonedTex.colorSpace = SRGBColorSpace;
      clonedTex.needsUpdate = true;
      return clonedTex;
    };
    
    if (textureCache.has(cacheKey)) {
      resolve(applyTextureSettings(textureCache.get(cacheKey)));
      return;
    }
    
    const loader = new TextureLoader();
    loader.load(
      textureDef.uri,
      tex => {
        textureCache.set(cacheKey, tex);
        resolve(applyTextureSettings(tex));
      },
      undefined,
      err => {
        console.warn('[WallFactory] Texture load failed:', textureDef.uri, err);
        resolve(null);
      }
    );
  });
}

/**
 * Create materials array for wall
 */
function createWallMaterials(soulColor) {
  return [
    new MeshBasicMaterial({ color: soulColor, side: FrontSide }), // 0: exterior - textureA
    new MeshBasicMaterial({ color: soulColor, side: FrontSide }), // 1: interior - textureB
    new MeshBasicMaterial({ color: soulColor, side: FrontSide }), // 2: top - gray
    new MeshBasicMaterial({ color: soulColor, side: FrontSide }), // 3: bottom - gray
    new MeshBasicMaterial({ color: soulColor, side: FrontSide }), // 4: right end - gray
    new MeshBasicMaterial({ color: soulColor, side: FrontSide })  // 5: left end - gray
  ];
}

/**
 * Main wall building function
 */
export function buildWall(element, layer, scene, textures) {
  let vertex0 = layer.vertices.get(element.vertices.get(0));
  let vertex1 = layer.vertices.get(element.vertices.get(1));
  let inverted = false;

  if (vertex0.x > vertex1.x) {
    [vertex0, vertex1] = [vertex1, vertex0];
    inverted = true;
  }

  // Wall height is above slab, not total height
  const wallHeight = element.properties.getIn(['height', 'length']);
  const thickness = element.properties.getIn(['thickness', 'length']);
  
  // Get slab height from areas
  let slabHeight = 20;
  try {
    layer.areas.some(area => {
      const ft = area?.getIn(['properties', 'floorThickness', 'length']);
      if (ft) { slabHeight = ft; return true; }
      return false;
    });
  } catch (e) { /* use default */ }
  const distance = verticesDistance(vertex0, vertex1);
  const halfDistance = distance / 2;
  
  const miterOffsets = calculateWallMiterOffsets(vertex0, vertex1, element.id, layer, thickness);
  const { miter0, miter1 } = miterOffsets;

  const soulColorValue = element.selected ? SharedStyle.MESH_SELECTED : 0xD3D3D3;
  const soulColor = new Color(soulColorValue);
  
  // Get texture definitions
  const interiorTextureKey = element.properties.get('textureA');
  const exteriorTextureKey = element.properties.get('textureB');
  
  // Check if side A faces inside (from area detection)
  const sideAInside = element.properties.get('sideAInside');
  
  // Determine which texture should go on which material index
  // Material 0 = +Z face (exterior in geometry)
  // Material 1 = -Z face (interior in geometry)
  // 
  // If sideAInside is true, side A faces inside, so:
  //   - textureA should be on the "inside" face (material 1)
  //   - textureB should be on the "outside" face (material 0)
  // If sideAInside is false or undefined, side A faces outside (default), so:
  //   - textureA should be on the "outside" face (material 0)
  //   - textureB should be on the "inside" face (material 1)
  
  const materialTextureA = sideAInside ? 1 : 0; // Which material index gets textureA
  const materialTextureB = sideAInside ? 0 : 1; // Which material index gets textureB
  
  const textureDef_B = textures?.[exteriorTextureKey] && exteriorTextureKey !== 'none' ? textures[exteriorTextureKey] : null;
  const textureDef_A = textures?.[interiorTextureKey] && interiorTextureKey !== 'none' ? textures[interiorTextureKey] : null;

  // Create materials
  const wallMaterials = createWallMaterials(soulColor);
  const slabMaterials = createWallMaterials(soulColor);

  // Collect holes for wall portion
  const wallHoles = [];
  element.holes.forEach(holeID => {
    const holeData = layer.holes.get(holeID);
    if (!holeData) return;

    const holeWidth = holeData.properties.getIn(['width', 'length']);
    const holeHeight = holeData.properties.getIn(['height', 'length']);
    // Altitude is now relative to slab top (0 = sitting on slab)
    const holeAltitude = holeData.properties.getIn(['altitude', 'length']);
    const offset = inverted ? 1 - holeData.offset : holeData.offset;
    const holeLocalX = offset * distance - holeWidth / 2;
    
    // Ensure hole doesn't go below slab (altitude >= 0)
    const effectiveAltitude = Math.max(holeAltitude, 0);
    const holeTop = effectiveAltitude + holeHeight;
    
    if (holeTop > 0) {
      const wallHoleBottom = effectiveAltitude;
      const wallHoleTop = Math.min(holeTop, wallHeight);
      
      if (wallHoleTop > wallHoleBottom) {
        wallHoles.push({
          x: holeLocalX,
          y: wallHoleBottom,
          width: holeWidth,
          height: wallHoleTop - wallHoleBottom
        });
      }
    }
  });

  // Build geometries
  const wallGeometry = buildWallWithHoles(distance, wallHeight, thickness, miter0, miter1, wallHoles);
  const slabGeometry = buildWallWithHoles(distance, slabHeight, thickness, miter0, miter1, []);

  // Create meshes
  const soul = new Mesh(wallGeometry, wallMaterials);
  const slab = new Mesh(slabGeometry, slabMaterials);

  // Position and rotate
  const alpha = Math.asin((vertex1.y - vertex0.y) / distance);
  const sinAlpha = Math.sin(alpha);
  const cosAlpha = Math.cos(alpha);

  soul.position.set(halfDistance * cosAlpha, slabHeight, -halfDistance * sinAlpha);
  soul.rotation.y = alpha;
  
  slab.position.set(halfDistance * cosAlpha, 0, -halfDistance * sinAlpha);
  slab.rotation.y = alpha;

  soul.name = 'soul';
  slab.name = 'slab';

  // Create edge lines for wall boundaries only (not internal segment edges)
  // We manually define the outer boundary edges
  const edgeMaterial = new LineBasicMaterial({ color: 0x000000, linewidth: 1 });
  
  // Create boundary edge lines for soul (wall above slab)
  const soulEdges = createWallBoundaryEdges(distance, wallHeight, thickness, miter0, miter1, wallHoles);
  const soulEdgeLines = new LineSegments(soulEdges, edgeMaterial);
  soulEdgeLines.name = 'edges';
  soul.add(soulEdgeLines);
  
  // Create boundary edge lines for slab (no holes)
  const slabEdges = createWallBoundaryEdges(distance, slabHeight, thickness, miter0, miter1, []);
  const slabEdgeLines = new LineSegments(slabEdges, edgeMaterial);
  slabEdgeLines.name = 'edges';
  slab.add(slabEdgeLines);

  const group = new Group();
  group.add(soul);
  group.add(slab);

  // Load and apply textures
  const texturePromises = [];
  
  if (textureDef_A) {
    texturePromises.push(
      loadWallTexture(textureDef_A, distance, wallHeight).then(tex => {
        if (tex) {
          wallMaterials[materialTextureA].map = tex;
          wallMaterials[materialTextureA].color.set(0xffffff);
          wallMaterials[materialTextureA].needsUpdate = true;
        }
      }),
      loadWallTexture(textureDef_A, distance, slabHeight).then(tex => {
        if (tex) {
          slabMaterials[materialTextureA].map = tex;
          slabMaterials[materialTextureA].color.set(0xffffff);
          slabMaterials[materialTextureA].needsUpdate = true;
        }
      })
    );
  }
  
  if (textureDef_B) {
    texturePromises.push(
      loadWallTexture(textureDef_B, distance, wallHeight).then(tex => {
        if (tex) {
          wallMaterials[materialTextureB].map = tex;
          wallMaterials[materialTextureB].color.set(0xffffff);
          wallMaterials[materialTextureB].needsUpdate = true;
        }
      }),
      loadWallTexture(textureDef_B, distance, slabHeight).then(tex => {
        if (tex) {
          slabMaterials[materialTextureB].map = tex;
          slabMaterials[materialTextureB].color.set(0xffffff);
          slabMaterials[materialTextureB].needsUpdate = true;
        }
      })
    );
  }

  return texturePromises.length > 0 
    ? Promise.all(texturePromises).then(() => group)
    : Promise.resolve(group);
}

export function updatedWall(element, layer, scene, textures, mesh, oldElement, differences, selfDestroy, selfBuild) {
  const noPerf = () => { selfDestroy(); return selfBuild(); };

  const soul = mesh.getObjectByName('soul');
  if (!soul) return noPerf();

  if (differences[0] === 'selected') {
    const newColor = new Color(element.selected ? SharedStyle.MESH_SELECTED : 0xD3D3D3);
    
    [soul, mesh.getObjectByName('slab')].forEach(m => {
      if (m && Array.isArray(m.material)) {
        m.material.forEach(mat => {
          if (!mat.map) {
            mat.color.copy(newColor);
            mat.needsUpdate = true;
          }
        });
      }
    });
    
    return Promise.resolve(mesh);
  }
  
  return noPerf();
}
