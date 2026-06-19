import { GLTFLoader, SkeletonUtils } from "three-stdlib";
import * as Three from "three";
import { buildResilientAssetUrlCandidates } from "../../../utils/asset-url";

const gltfPromiseCache = new Map();
const gltfSceneCache = new Map();
const PLANNER_GLTF_DETAILS_KEY = "__plannerGLTFDetails";
const TEXTURE_COLOR_SPACE_BY_SLOT = {
  map: Three.SRGBColorSpace,
  emissiveMap: Three.SRGBColorSpace,
  specularColorMap: Three.SRGBColorSpace,
};
const TRACKED_TEXTURE_SLOTS = [
  "map",
  "emissiveMap",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "alphaMap",
  "aoMap",
  "lightMap",
  "bumpMap",
  "displacementMap",
  "transmissionMap",
  "thicknessMap",
  "clearcoatMap",
  "clearcoatNormalMap",
  "clearcoatRoughnessMap",
  "sheenColorMap",
  "sheenRoughnessMap",
  "specularColorMap",
  "specularIntensityMap",
  "iridescenceMap",
  "iridescenceThicknessMap",
  "anisotropyMap",
];
const SIDE_LABELS = {
  [Three.FrontSide]: "front",
  [Three.BackSide]: "back",
  [Three.DoubleSide]: "double",
};
const WRAPPING_LABELS = {
  [Three.ClampToEdgeWrapping]: "clamp-to-edge",
  [Three.RepeatWrapping]: "repeat",
  [Three.MirroredRepeatWrapping]: "mirrored-repeat",
};
const FILTER_LABELS = {
  [Three.NearestFilter]: "nearest",
  [Three.NearestMipmapNearestFilter]: "nearest-mipmap-nearest",
  [Three.NearestMipmapLinearFilter]: "nearest-mipmap-linear",
  [Three.LinearFilter]: "linear",
  [Three.LinearMipmapNearestFilter]: "linear-mipmap-nearest",
  [Three.LinearMipmapLinearFilter]: "linear-mipmap-linear",
};

export const normalizeAssetCacheKey = (assetUrl) => {
  const rawUrl = String(assetUrl || "").trim();
  if (!rawUrl) return "";
  if (/^(blob:|data:)/i.test(rawUrl)) return rawUrl;

  try {
    const parsed = new URL(rawUrl, "https://immutable.asset.local");
    parsed.hash = "";

    if (/^(https?:)?\/\//i.test(rawUrl)) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch (_) {
    return rawUrl;
  }
};

function cloneColor(colorLike, fallbackHex = 0xffffff) {
  if (colorLike?.isColor) {
    return colorLike.clone();
  }

  return new Three.Color(fallbackHex);
}

function roundNumber(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function colorToHex(colorLike) {
  return colorLike?.isColor ? `#${colorLike.getHexString()}` : null;
}

function colorLuminance(colorLike) {
  if (!colorLike?.isColor) return 1;
  return colorLike.r * 0.2126 + colorLike.g * 0.7152 + colorLike.b * 0.0722;
}

function materialNameForWarning(material, mesh) {
  return material?.name || mesh?.name || mesh?.uuid || "unnamed-mesh";
}

function normalizeTextureForPlanner(texture, textureSlot) {
  if (!texture) return texture;

  const expectedColorSpace = TEXTURE_COLOR_SPACE_BY_SLOT[textureSlot];
  if (expectedColorSpace && texture.colorSpace !== expectedColorSpace) {
    texture.colorSpace = expectedColorSpace;
    texture.needsUpdate = true;
  }

  if (textureSlot === "map") {
    texture.generateMipmaps = texture.generateMipmaps !== false;
  }

  return texture;
}

function materialUsesSecondaryUvs(material) {
  if (!material) return false;

  if (Array.isArray(material)) {
    return material.some((entry) => materialUsesSecondaryUvs(entry));
  }

  return Boolean(material.aoMap || material.lightMap);
}

function ensureSecondaryUvs(geometry) {
  if (!geometry?.getAttribute || geometry.getAttribute("uv2")) {
    return false;
  }

  const uv = geometry.getAttribute("uv");
  if (!uv?.clone) {
    return false;
  }

  geometry.setAttribute("uv2", uv.clone());
  return true;
}

function serializeTexture(texture, textureSlot) {
  if (!texture) return null;

  return {
    name: texture.name || "",
    slot: textureSlot,
    channel: Number.isFinite(texture.channel) ? texture.channel : 0,
    colorSpace: texture.colorSpace || "",
    flipY: texture.flipY !== false,
    wrapS: WRAPPING_LABELS[texture.wrapS] || String(texture.wrapS),
    wrapT: WRAPPING_LABELS[texture.wrapT] || String(texture.wrapT),
    minFilter: FILTER_LABELS[texture.minFilter] || String(texture.minFilter),
    magFilter: FILTER_LABELS[texture.magFilter] || String(texture.magFilter),
    anisotropy: roundNumber(texture.anisotropy, 2),
    rotation: roundNumber(texture.rotation, 4),
  };
}

function serializeMaterial(material) {
  if (!material) return null;

  const textures = TRACKED_TEXTURE_SLOTS.reduce((accumulator, textureSlot) => {
    const textureProfile = serializeTexture(material[textureSlot], textureSlot);
    if (textureProfile) {
      accumulator[textureSlot] = textureProfile;
    }
    return accumulator;
  }, {});

  return {
    name: material.name || "",
    type: material.type || "",
    side: SIDE_LABELS[material.side] || String(material.side),
    transparent: Boolean(material.transparent),
    opacity:
      typeof material.opacity === "number"
        ? roundNumber(material.opacity, 4)
        : null,
    alphaTest:
      typeof material.alphaTest === "number"
        ? roundNumber(material.alphaTest, 4)
        : null,
    depthWrite: material.depthWrite !== false,
    depthTest: material.depthTest !== false,
    toneMapped: material.toneMapped !== false,
    vertexColors: Boolean(material.vertexColors),
    flatShading: Boolean(material.flatShading),
    unlit: Boolean(material.isMeshBasicMaterial),
    receivesLights: !material.isMeshBasicMaterial,
    color: colorToHex(material.color),
    emissive: colorToHex(material.emissive),
    emissiveIntensity:
      typeof material.emissiveIntensity === "number"
        ? roundNumber(material.emissiveIntensity, 4)
        : null,
    metalness:
      typeof material.metalness === "number"
        ? roundNumber(material.metalness, 4)
        : null,
    roughness:
      typeof material.roughness === "number"
        ? roundNumber(material.roughness, 4)
        : null,
    transmission:
      typeof material.transmission === "number"
        ? roundNumber(material.transmission, 4)
        : null,
    thickness:
      typeof material.thickness === "number"
        ? roundNumber(material.thickness, 4)
        : null,
    ior:
      typeof material.ior === "number" ? roundNumber(material.ior, 4) : null,
    clearcoat:
      typeof material.clearcoat === "number"
        ? roundNumber(material.clearcoat, 4)
        : null,
    sheen:
      typeof material.sheen === "number"
        ? roundNumber(material.sheen, 4)
        : null,
    iridescence:
      typeof material.iridescence === "number"
        ? roundNumber(material.iridescence, 4)
        : null,
    textureSlots: textures,
    gltfExtensions: Object.keys(material.userData?.gltfExtensions || {}),
  };
}

function buildPlannerGLTFDetails(scene, source, warnings = []) {
  const materialProfiles = [];
  const materialIds = new Set();
  const textureIds = new Set();
  const materialTypes = new Set();
  const box = new Three.Box3().setFromObject(scene);
  const isEmptyBounds = box.isEmpty();
  const size = isEmptyBounds
    ? new Three.Vector3()
    : box.getSize(new Three.Vector3());
  const boundsMin = isEmptyBounds ? new Three.Vector3() : box.min;
  const boundsMax = isEmptyBounds ? new Three.Vector3() : box.max;
  let meshCount = 0;
  let skinnedMeshCount = 0;
  let triangleCount = 0;

  scene.traverse((child) => {
    if (!child.isMesh) return;

    meshCount += 1;
    if (child.isSkinnedMesh) {
      skinnedMeshCount += 1;
    }

    const positionAttribute = child.geometry?.getAttribute?.("position");
    const indexAttribute = child.geometry?.getIndex?.();
    if (indexAttribute?.count) {
      triangleCount += indexAttribute.count / 3;
    } else if (positionAttribute?.count) {
      triangleCount += positionAttribute.count / 3;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material || materialIds.has(material.uuid)) return;

      materialIds.add(material.uuid);
      materialTypes.add(material.type || "UnknownMaterial");
      materialProfiles.push(serializeMaterial(material));

      TRACKED_TEXTURE_SLOTS.forEach((textureSlot) => {
        const texture = material[textureSlot];
        if (texture?.uuid) {
          textureIds.add(texture.uuid);
        }
      });
    });
  });

  return {
    source,
    sourceFormat: /\.glb($|[?#])/i.test(source) ? "glb" : "gltf",
    assumedLinearUnit: "meters",
    meshCount,
    skinnedMeshCount,
    materialCount: materialProfiles.length,
    textureCount: textureIds.size,
    triangleCount: Math.round(triangleCount),
    usesSceneLighting: materialProfiles.some(
      (material) => material?.receivesLights,
    ),
    hasUnlitMaterials: materialProfiles.some((material) => material?.unlit),
    hasTransmission: materialProfiles.some(
      (material) => (material?.transmission || 0) > 0,
    ),
    bounds: {
      min: {
        x: roundNumber(boundsMin.x),
        y: roundNumber(boundsMin.y),
        z: roundNumber(boundsMin.z),
      },
      max: {
        x: roundNumber(boundsMax.x),
        y: roundNumber(boundsMax.y),
        z: roundNumber(boundsMax.z),
      },
      size: {
        x: roundNumber(size.x),
        y: roundNumber(size.y),
        z: roundNumber(size.z),
      },
    },
    materialTypes: Array.from(materialTypes),
    materials: materialProfiles,
    warnings,
  };
}

function createPlannerFallbackMaterial(sourceMaterial) {
  const fallbackMaterial = new Three.MeshStandardMaterial({
    color: cloneColor(sourceMaterial?.color, 0xffffff),
    map: sourceMaterial?.map || null,
    normalMap: sourceMaterial?.normalMap || null,
    roughnessMap: sourceMaterial?.roughnessMap || null,
    metalnessMap: sourceMaterial?.metalnessMap || null,
    alphaMap: sourceMaterial?.alphaMap || null,
    aoMap: sourceMaterial?.aoMap || null,
    emissiveMap: sourceMaterial?.emissiveMap || null,
    transparent: Boolean(sourceMaterial?.transparent),
    opacity:
      typeof sourceMaterial?.opacity === "number" ? sourceMaterial.opacity : 1,
    side: sourceMaterial?.side ?? Three.FrontSide,
    wireframe: Boolean(sourceMaterial?.wireframe),
    alphaTest:
      typeof sourceMaterial?.alphaTest === "number"
        ? sourceMaterial.alphaTest
        : 0,
    name: sourceMaterial?.name || "",
    metalness:
      typeof sourceMaterial?.metalness === "number"
        ? sourceMaterial.metalness
        : 0,
    roughness:
      typeof sourceMaterial?.roughness === "number"
        ? sourceMaterial.roughness
        : 0.92,
  });

  fallbackMaterial.emissive = cloneColor(sourceMaterial?.emissive, 0x000000);

  if (sourceMaterial?.normalScale?.clone) {
    fallbackMaterial.normalScale = sourceMaterial.normalScale.clone();
  }

  return fallbackMaterial;
}

export function normalizeMaterialForPlanner(material) {
  if (!material) return material;

  TRACKED_TEXTURE_SLOTS.forEach((textureSlot) => {
    normalizeTextureForPlanner(material[textureSlot], textureSlot);
  });

  if (material.isMeshBasicMaterial && material.toneMapped !== false) {
    material.toneMapped = false;
  }

  if (
    typeof material.opacity === "number" &&
    material.opacity < 1 &&
    material.transparent !== true
  ) {
    material.transparent = true;
  }

  if (material.map && material.color?.isColor && colorLuminance(material.color) < 0.035) {
    material.color.set(0xffffff);
  }

  material.needsUpdate = true;
  return material;
}

function normalizeSceneForPlanner(scene) {
  const normalizationWarnings = [];

  scene.traverse((child) => {
    if (!child.isMesh) return;

    if (!child.material) {
      child.material = createPlannerFallbackMaterial(null);
      normalizationWarnings.push(
        `Applied fallback material to "${materialNameForWarning(null, child)}".`,
      );
    } else if (Array.isArray(child.material)) {
      child.material = child.material.map((material) =>
        normalizeMaterialForPlanner(material),
      );
    } else {
      child.material = normalizeMaterialForPlanner(child.material);
    }

    if (
      child.geometry?.getAttribute &&
      !child.geometry.getAttribute("normal") &&
      child.geometry.getAttribute("position")?.count >= 3
    ) {
      child.geometry.computeVertexNormals();
      normalizationWarnings.push(
        `Computed missing vertex normals for "${materialNameForWarning(child.material, child)}".`,
      );
    }

    if (
      materialUsesSecondaryUvs(child.material) &&
      ensureSecondaryUvs(child.geometry)
    ) {
      normalizationWarnings.push(
        `Copied uv to uv2 for "${materialNameForWarning(child.material, child)}" because the material uses ao/light maps.`,
      );
    }

    child.frustumCulled = true;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  scene.userData[PLANNER_GLTF_DETAILS_KEY] = buildPlannerGLTFDetails(
    scene,
    scene.userData.__plannerSource || "",
    normalizationWarnings,
  );
  return scene;
}

function configureLoaderPath(loader, gltfFile, options = {}) {
  const source = String(gltfFile || "");
  if (!source) return;

  const isBinary = options.isBinary === true || /\.glb($|[?#])/i.test(source);
  const isExternalUrl = /^(blob:|data:|https?:\/\/)/i.test(source);
  const lastSlash = source.lastIndexOf("/");

  if (!isBinary && !isExternalUrl && lastSlash !== -1) {
    loader.setPath(source.substring(0, lastSlash + 1));
  }
}

export function loadGLTF(gltfFile, onProgress, options = {}) {
  const cacheKey = normalizeAssetCacheKey(gltfFile);
  if (!cacheKey) {
    return Promise.reject(new Error("Missing GLTF/GLB source"));
  }

  if (gltfSceneCache.has(cacheKey)) {
    return Promise.resolve(gltfSceneCache.get(cacheKey));
  }

  if (gltfPromiseCache.has(cacheKey)) {
    return gltfPromiseCache.get(cacheKey);
  }

  const candidateSources = buildResilientAssetUrlCandidates(gltfFile, {
    includeBackendOrigin: true,
    includeApiBasePathVariant: true,
  }).filter(Boolean);
  const sourceCandidates = candidateSources.length > 0 ? candidateSources : [cacheKey];

  const promise = new Promise((resolve, reject) => {
    let candidateIndex = 0;
    let lastError = null;

    const attemptLoad = () => {
      const activeSource = sourceCandidates[candidateIndex];
      const loader = new GLTFLoader();
      configureLoaderPath(loader, activeSource, options);

      loader.load(
        activeSource,
        (gltf) => {
          const scene = gltf.scene || new Three.Group();
          scene.userData.__plannerSource = activeSource;
          normalizeSceneForPlanner(scene);
          gltfSceneCache.set(cacheKey, scene);
          gltfPromiseCache.delete(cacheKey);
          resolve(scene);
        },
        onProgress,
        (error) => {
          lastError = error;
          candidateIndex += 1;

          if (candidateIndex < sourceCandidates.length) {
            attemptLoad();
            return;
          }

          gltfPromiseCache.delete(cacheKey);
          console.error("Error loading GLTF/GLB:", lastError || error);
          reject(lastError || error);
        },
      );
    };

    attemptLoad();
  });

  gltfPromiseCache.set(cacheKey, promise);
  return promise;
}

export function preloadGLTF(gltfFile, options = {}) {
  return loadGLTF(gltfFile, null, options);
}

export function preloadGLB(glbFile, options = {}) {
  return loadGLTF(glbFile, null, { ...options, isBinary: true });
}

export function deepCloneWithMaterials(object) {
  const cloned = SkeletonUtils.clone(object);

  cloned.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
    } else {
      child.material = child.material.clone();
    }
  });

  return cloned;
}

export function cloneSharedGLTFScene(object) {
  return SkeletonUtils.clone(object);
}

export function getPlannerGLTFDetails(object) {
  return object?.userData?.[PLANNER_GLTF_DETAILS_KEY] || null;
}

export function loadGLB(glbFile, onProgress, options = {}) {
  return loadGLTF(glbFile, onProgress, { ...options, isBinary: true });
}
