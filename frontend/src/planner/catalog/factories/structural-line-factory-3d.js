import {
  BoxGeometry,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { verticesDistance } from '../../utils/geometry';
import * as SharedStyle from '../../shared-style';
import {
  applyPlannerTextureToMaterial,
  ensureGeometrySupportsAmbientOcclusion,
  markMaterialTextureRequest,
} from '../utils/texture-map-loader';
import { resolvePlannerTextureDefinition } from '../utils/cloud-texture-registry';

function getLineLengthProperty(line, propertyName, fallback = 0) {
  const value = Number(line?.getIn?.(['properties', propertyName, 'length']));
  return Number.isFinite(value) ? value : fallback;
}

function getLayerWallHeight(layer, fallbackHeight) {
  let maxWallHeight = 0;
  layer?.lines?.forEach?.((line) => {
    if (line?.type !== 'wall') return;
    const wallHeight = getLineLengthProperty(line, 'height', 0);
    if (wallHeight > maxWallHeight) maxWallHeight = wallHeight;
  });

  return maxWallHeight > 0 ? maxWallHeight : fallbackHeight;
}

function createStructuralMaterials(soulColor) {
  return [
    new MeshStandardMaterial({ color: soulColor, side: FrontSide, roughness: 1, metalness: 0 }),
    new MeshStandardMaterial({ color: soulColor, side: FrontSide, roughness: 1, metalness: 0 }),
    new MeshStandardMaterial({ color: soulColor, side: FrontSide, roughness: 1, metalness: 0 }),
    new MeshStandardMaterial({ color: soulColor, side: FrontSide, roughness: 1, metalness: 0 }),
    new MeshStandardMaterial({ color: soulColor, side: FrontSide, roughness: 1, metalness: 0 }),
    new MeshStandardMaterial({ color: soulColor, side: FrontSide, roughness: 1, metalness: 0 }),
  ];
}

function buildGeometry(length, height, width) {
  const geometry = new BoxGeometry(length, height, width);
  geometry.clearGroups();
  geometry.addGroup(24, 6, 0); // +Z
  geometry.addGroup(30, 6, 1); // -Z
  geometry.addGroup(12, 6, 2); // +Y
  geometry.addGroup(18, 6, 3); // -Y
  geometry.addGroup(0, 6, 4); // +X
  geometry.addGroup(6, 6, 5); // -X
  ensureGeometrySupportsAmbientOcclusion(geometry);
  return geometry;
}

function getBeamBottomOffset(element, layer, height) {
  const position = String(element?.getIn?.(['properties', 'position']) || 'ceiling');
  const distanceFromFloor = Math.max(
    0,
    getLineLengthProperty(element, 'distanceFromFloor', 0)
  );
  const referenceWallHeight = getLayerWallHeight(layer, height);
  const maxBottomOffset = Math.max(0, referenceWallHeight - height);

  if (position === 'ceiling') {
    const topOffset = Math.max(0, referenceWallHeight - distanceFromFloor);
    return Math.max(0, Math.min(maxBottomOffset, topOffset - height));
  }

  return Math.max(0, Math.min(maxBottomOffset, distanceFromFloor));
}

function applyTextureOnMaterials(materials, materialIndices, textureDefinition, lineLength, height, width) {
  const materialDimensions = {
    0: { width: lineLength, height },
    1: { width: lineLength, height },
    2: { width: lineLength, height: width },
    3: { width: lineLength, height: width },
  };

  materialIndices.forEach((materialIndex) => {
    const material = materials[materialIndex];
    const textureToken = markMaterialTextureRequest(material);
    const textureDimensions = materialDimensions[materialIndex];
    applyPlannerTextureToMaterial(
      material,
      textureDefinition,
      textureDimensions,
      textureToken,
    ).catch((error) => {
      console.warn(
        "[StructuralLineFactory] Texture application failed",
        {
          textureId: textureDefinition?.id || null,
          materialIndex,
          textureDimensions,
        },
        error,
      );
    });
  });
}

export function buildStructuralLine(element, layer, _scene, textures, options = {}) {
  let vertex0 = layer.vertices.get(element.vertices.get(0));
  let vertex1 = layer.vertices.get(element.vertices.get(1));

  if (vertex0.x > vertex1.x) {
    [vertex0, vertex1] = [vertex1, vertex0];
  }

  const lineLength = Math.max(verticesDistance(vertex0, vertex1), 1);
  const width = Math.max(getLineLengthProperty(element, 'thickness', options.defaultThickness || 24), 1);
  const fallbackHeight = options.defaultHeight || 280;
  const height = Math.max(getLineLengthProperty(element, 'height', getLayerWallHeight(layer, fallbackHeight)), 1);
  const verticalOffset = options.kind === 'beam' ? getBeamBottomOffset(element, layer, height) : 0;

  const geometry = buildGeometry(lineLength, height, width);
  const soulColorValue = element.selected ? SharedStyle.MESH_SELECTED : 0xD3D3D3;
  const soulColor = new Color(soulColorValue);
  const materials = createStructuralMaterials(soulColor);
  const mesh = new Mesh(geometry, materials);
  const halfLineLength = lineLength / 2;
  const alpha = Math.asin((vertex1.y - vertex0.y) / lineLength);

  mesh.position.set(
    halfLineLength * Math.cos(alpha),
    verticalOffset + height / 2,
    -halfLineLength * Math.sin(alpha),
  );
  mesh.rotation.y = alpha;
  mesh.name = 'soul';

  const textureAKey = element.properties.get('textureA');
  const textureBKey = element.properties.get('textureB');
  const textureDefA = resolvePlannerTextureDefinition(textureAKey, {
    targetType: 'wall',
    fallbackTextures: textures,
  });
  const textureDefB = resolvePlannerTextureDefinition(textureBKey, {
    targetType: 'wall',
    fallbackTextures: textures,
  });

  if (textureDefA) {
    applyTextureOnMaterials(materials, [0, 2], textureDefA, lineLength, height, width);
  }

  if (textureDefB) {
    applyTextureOnMaterials(materials, [1, 3], textureDefB, lineLength, height, width);
  }

  const group = new Group();
  group.add(mesh);
  return Promise.resolve(group);
}

export function updatedStructuralLine(
  element,
  _layer,
  _scene,
  _textures,
  mesh,
  _oldElement,
  differences,
  selfDestroy,
  selfBuild,
) {
  const noPerf = () => {
    selfDestroy();
    return selfBuild();
  };

  const soul = mesh.getObjectByName('soul');
  if (!soul) return noPerf();

  if (differences[0] === 'selected') {
    const selectedColor = new Color(element.selected ? SharedStyle.MESH_SELECTED : 0xD3D3D3);
    if (Array.isArray(soul.material)) {
      soul.material.forEach((material) => {
        if (!material?.map) {
          material.color.copy(selectedColor);
          material.needsUpdate = true;
        }
      });
    }
    return Promise.resolve(mesh);
  }

  return noPerf();
}
