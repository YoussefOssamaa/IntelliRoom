import {
  Shape,
  MeshPhongMaterial,
  MeshStandardMaterial,
  ShapeGeometry,
  Box3,
  Object3D,
  Mesh,
  MeshBasicMaterial,
  Vector2,
  DoubleSide,
  Float32BufferAttribute,
  Color,
  ExtrudeGeometry
} from 'three';
import * as SharedStyle from '../../shared-style';
import { computeInsetPolygon } from './area-utils';
import {
  applyPlannerTextureToMaterial,
  ensureGeometrySupportsAmbientOcclusion,
  markMaterialTextureRequest,
} from '../utils/texture-map-loader';
import { resolvePlannerTextureDefinition } from '../utils/cloud-texture-registry';

/**
 * Apply a texture to a wall face
 * @param material: The material of the face
 * @param texture: The texture to load
 * @param length: The lenght of the face
 * @param height: The height of the face
 */
const assignUVs = (geometry) => {
  geometry.computeBoundingBox();

  let {min, max} = geometry.boundingBox;

  let offset = new Vector2(0 - min.x, 0 - min.y);
  let range = new Vector2(max.x - min.x, max.y - min.y);

  // Modern Three.js uses BufferGeometry with position attribute
  let positions = geometry.attributes.position;
  let uvs = [];

  // Generate UVs for each vertex
  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    
    uvs.push(
      (x + offset.x) / range.x,
      (y + offset.y) / range.y
    );
  }

  // Set UV attribute
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
};

export function createArea(element, layer, scene, textures) {
  const FLOOR_TEXTURE_SURFACE_OFFSET = 0.25;

  // Gather raw vertices (Immutable Records have .x, .y, .id)
  let rawVertices = [];
  element.vertices.forEach(vertexID => {
    rawVertices.push(layer.vertices.get(vertexID));
  });

  // Offset each edge inward by the half-thickness of its bordering wall
  // so the 3D floor starts at the inner face of each wall.
  const insetVerts = computeInsetPolygon(rawVertices, layer);

  let textureName = element.properties.get('texture');
  let color = element.selected ? SharedStyle.AREA_MESH_COLOR.selected : SharedStyle.AREA_MESH_COLOR.unselected;
  let floorThickness = element.properties.getIn(['floorThickness', 'length']) || 20;
  let roomHeight = element.properties.getIn(['roomHeight', 'length']) || 280;

  if (!element.selected && textureName && textureName !== 'none') {
    color = SharedStyle.AREA_MESH_COLOR.unselected;
  }

  let shape = new Shape();
  shape.moveTo(insetVerts[0].x, insetVerts[0].y);
  for (let i = 1; i < insetVerts.length; i++) {
    shape.lineTo(insetVerts[i].x, insetVerts[i].y);
  }

  // Ensure color is a THREE.Color instance for modern three.js
  const areaColor = color instanceof Color ? color : new Color(color);
  let floorMaterial = new MeshStandardMaterial({
    side: DoubleSide,
    color: areaColor,
    roughness: 1,
    metalness: 0,
  });
  floorMaterial.polygonOffset = true;
  floorMaterial.polygonOffsetFactor = 1;
  floorMaterial.polygonOffsetUnits = 1;
  let floorTopMaterial = floorMaterial;
  let ceilingMaterial = new MeshPhongMaterial({ side: DoubleSide, color: new Color(0xf5f5f5), map: null });

  /* Create holes for the area */
  element.holes.forEach(holeID => {
    let holeCoords = [];
    layer.getIn(['areas', holeID, 'vertices']).forEach(vertexID => {
      let {x, y} = layer.getIn(['vertices', vertexID]);
      holeCoords.push([x, y]);
    });
    holeCoords = holeCoords.reverse();
    let holeShape = createShape(holeCoords);
    shape.holes.push(holeShape);
  });

  let shapeGeometry = new ShapeGeometry(shape);
  assignUVs(shapeGeometry);

  let boundingBox = new Box3().setFromObject(new Mesh(shapeGeometry, new MeshBasicMaterial()));

  let width = boundingBox.max.x - boundingBox.min.x;
  let height = boundingBox.max.y - boundingBox.min.y;

  let texture = resolvePlannerTextureDefinition(textureName, {
    targetType: 'floor',
    fallbackTextures: textures,
  });

  if (textureName && textureName !== 'none' && !texture) {
    console.error('[PlannerTextures][Trace] Failed to resolve floor texture', {
      textureName,
      areaId: element.id,
    });
  }

  // Create floor with actual 3D thickness using ExtrudeGeometry
  // Bottom at y=0, top at floorThickness (where it meets the wall slab)
  const extrudeSettings = {
    depth: floorThickness,
    bevelEnabled: false
  };
  
  let floorGeometry = new ExtrudeGeometry(shape, extrudeSettings);
  
  // The slab keeps a plain material. A separate top plane carries the floor
  // texture so it never wraps around the slab sides or bottom.
  
  let floor = new Mesh(floorGeometry, floorMaterial);
  
  // Rotate to horizontal and position so bottom is at y=0, top at floorThickness
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0; // Position so top is at floorThickness, extruded downward
  floor.name = 'floor';

  let floorTop = null;
  if (texture) {
    floorTopMaterial = new MeshStandardMaterial({
      side: DoubleSide,
      color: areaColor,
      roughness: 1,
      metalness: 0,
    });
    floorTopMaterial.polygonOffset = true;
    floorTopMaterial.polygonOffsetFactor = -2;
    floorTopMaterial.polygonOffsetUnits = -8;

    const floorTopGeometry = shapeGeometry.clone();
    ensureGeometrySupportsAmbientOcclusion(floorTopGeometry);
    floorTop = new Mesh(floorTopGeometry, floorTopMaterial);
    floorTop.rotation.x = -Math.PI / 2;
    floorTop.position.y = floorThickness + FLOOR_TEXTURE_SURFACE_OFFSET;
    floorTop.renderOrder = 2;
    floorTop.name = 'floor-top';
  }

  // Create ceiling as thin plane
  let ceiling = new Mesh(shapeGeometry.clone(), ceilingMaterial);
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.y = roomHeight + floorThickness; // At total room height from ground
  ceiling.name = 'ceiling';

  // Create group to hold both floor and ceiling
  let areaGroup = new Object3D();
  areaGroup.add(floor);
  if (floorTop) {
    areaGroup.add(floorTop);
  }
  areaGroup.add(ceiling);

  if (texture) {
    const requestToken = markMaterialTextureRequest(floorTopMaterial);
    applyPlannerTextureToMaterial(
      floorTopMaterial,
      texture,
      { width, height },
      requestToken,
    ).catch((error) => {
      console.warn('[AreaFactory] Texture application failed:', texture?.id || textureName, error);
    });
  }

  return Promise.resolve(areaGroup);
}

export function updatedArea( element, layer, scene, textures, mesh, oldElement, differences, selfDestroy, selfBuild ) {
  let noPerf = () => { selfDestroy(); return selfBuild(); };
  let floor = mesh.getObjectByName('floor');
  let floorTop = mesh.getObjectByName('floor-top');
  let ceiling = mesh.getObjectByName('ceiling');

  if( differences[0] == 'selected' ) {
    let color = element.selected ? SharedStyle.AREA_MESH_COLOR.selected : SharedStyle.AREA_MESH_COLOR.unselected;
    if (floor) floor.material.color.set( color );
    if (floorTop && !floorTop.material.map) floorTop.material.color.set(color);
  }
  else if( differences[0] == 'properties' ){
    // If thickness or height properties changed, rebuild
    if( differences[1] === 'texture' || differences[1] === 'floorThickness' || differences[1] === 'roomHeight' ) {
      return noPerf();
    }
  }
  else return noPerf();

  return Promise.resolve(mesh);
}

/**
 * This function will create a shape given a list of coordinates
 * @param shapeCoords
 * @returns {Shape}
 */
const createShape = (shapeCoords) => {
  let shape = new Shape();
  shape.moveTo(shapeCoords[0][0], shapeCoords[0][1]);
  for (let i = 1; i < shapeCoords.length; i++) {
    shape.lineTo(shapeCoords[i][0], shapeCoords[i][1]);
  }
  return shape;
};
