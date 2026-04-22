import { GLTFLoader } from "three-stdlib";
import * as Three from "three";

const gltfPromiseCache = new Map();
const gltfSceneCache = new Map();

const normalizeCacheKey = (gltfFile) => String(gltfFile || "").trim();

export function normalizeMaterialForPlanner(material) {
  if (!material) return material;

  if (material.map) {
    material.map.colorSpace = Three.SRGBColorSpace;
    material.map.needsUpdate = true;
  }

  if (material.emissiveMap) {
    material.emissiveMap.colorSpace = Three.SRGBColorSpace;
    material.emissiveMap.needsUpdate = true;
  }

  if (material.aoMap) {
    material.aoMap.colorSpace = Three.LinearSRGBColorSpace;
  }

  const materialName = String(material.name || "").toLowerCase();
  const isStandardLike =
    material.isMeshStandardMaterial || material.isMeshPhysicalMaterial;

  if (isStandardLike) {
    if (
      !material.envMap &&
      !material.metalnessMap &&
      material.metalness > 0.2
    ) {
      material.metalness = 0.08;
    } else if (!material.metalnessMap && material.metalness > 0.6) {
      material.metalness = 0.12;
    }
    if (!material.roughnessMap && material.roughness < 0.08) {
      material.roughness = 0.35;
    }
  }

  const looksLikeGlass =
    materialName.includes("glass") || materialName.includes("glazing");
  if (looksLikeGlass) {
    material.transparent = true;
    material.opacity = Math.min(
      typeof material.opacity === "number" ? material.opacity : 1,
      0.35,
    );
    material.depthWrite = false;
    material.side = Three.DoubleSide;

    if (isStandardLike) {
      material.metalness = 0;
      material.roughness = Math.max(material.roughness ?? 0.08, 0.08);
    }

    if (material.isMeshPhysicalMaterial) {
      material.transmission = Math.max(material.transmission || 0, 0.85);
      material.thickness = Math.max(material.thickness || 0, 0.02);
      material.ior = material.ior || 1.45;
    }
  }

  material.needsUpdate = true;
  return material;
}

function normalizeSceneForPlanner(scene) {
  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => normalizeMaterialForPlanner(material));
    child.castShadow = true;
    child.receiveShadow = true;
  });

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
  const cacheKey = normalizeCacheKey(gltfFile);
  if (!cacheKey) {
    return Promise.reject(new Error("Missing GLTF/GLB source"));
  }

  if (gltfSceneCache.has(cacheKey)) {
    return Promise.resolve(gltfSceneCache.get(cacheKey));
  }

  if (gltfPromiseCache.has(cacheKey)) {
    return gltfPromiseCache.get(cacheKey);
  }

  const loader = new GLTFLoader();
  configureLoaderPath(loader, cacheKey, options);

  const promise = new Promise((resolve, reject) => {
    loader.load(
      cacheKey,
      (gltf) => {
        const scene = normalizeSceneForPlanner(gltf.scene || new Three.Group());
        scene.userData.__plannerSource = cacheKey;
        gltfSceneCache.set(cacheKey, scene);
        gltfPromiseCache.delete(cacheKey);
        resolve(scene);
      },
      onProgress,
      (error) => {
        gltfPromiseCache.delete(cacheKey);
        console.error("Error loading GLTF/GLB:", error);
        reject(error);
      },
    );
  });

  gltfPromiseCache.set(cacheKey, promise);
  return promise;
}

export function preloadGLTF(gltfFile, options = {}) {
  return loadGLTF(gltfFile, null, options);
}

export function deepCloneWithMaterials(object) {
  const cloned = object.clone();

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

export function loadGLB(glbFile, onProgress, options = {}) {
  return loadGLTF(glbFile, onProgress, { ...options, isBinary: true });
}
