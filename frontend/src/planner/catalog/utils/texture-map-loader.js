import {
  RepeatWrapping,
  NoColorSpace,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from "three";
import { buildResilientAssetUrlCandidates } from "../../../utils/asset-url";

const SOURCE_TEXTURE_PROMISE_CACHE = new Map();
const PLANNER_TEXTURE_MAP_SLOTS = [
  ["Color", "map"],
  ["NormalGL", "normalMap"],
  ["Roughness", "roughnessMap"],
];
const LINEAR_COLOR_MAPS = new Set(["NormalGL", "Roughness"]);

const getTextureColorSpace = (mapKey) =>
  LINEAR_COLOR_MAPS.has(mapKey) ? NoColorSpace : SRGBColorSpace;

const loadTextureCandidate = (url, mapKey) =>
  new Promise((resolve) => {
    const loader = new TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = getTextureColorSpace(mapKey);
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });

const loadSourceTexture = (url, mapKey) => {
  const cacheKey = `${mapKey}:${url}`;
  if (SOURCE_TEXTURE_PROMISE_CACHE.has(cacheKey)) {
    return SOURCE_TEXTURE_PROMISE_CACHE.get(cacheKey);
  }

  const promise = (async () => {
    const candidates = buildResilientAssetUrlCandidates(url, {
      includeBackendOrigin: true,
      includeApiBasePathVariant: true,
    });

    for (const candidate of candidates) {
      const texture = await loadTextureCandidate(candidate, mapKey);
      if (texture) {
        return texture;
      }
    }
    return null;
  })();

  SOURCE_TEXTURE_PROMISE_CACHE.set(cacheKey, promise);
  return promise;
};

export const preloadPlannerTextureDefinition = (textureDefinition) => {
  if (!textureDefinition) return;

  const colorMapUrl = textureDefinition?.maps?.Color || textureDefinition?.uri;
  if (colorMapUrl) {
    loadSourceTexture(colorMapUrl, "Color");
  }

  if (textureDefinition?.maps?.NormalGL) {
    loadSourceTexture(textureDefinition.maps.NormalGL, "NormalGL");
  }
};

const cloneConfiguredTexture = (
  sourceTexture,
  {
    mapKey,
    repeatX,
    repeatY,
  },
) => {
  if (!sourceTexture) return null;

  const texture = sourceTexture.clone();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = getTextureColorSpace(mapKey);
  texture.userData = {
    ...texture.userData,
    plannerDisposable: true,
  };
  texture.needsUpdate = true;
  return texture;
};

export const ensureGeometrySupportsAmbientOcclusion = (geometry) => {
  if (!geometry?.attributes?.uv || geometry.attributes.uv2) {
    return;
  }

  geometry.setAttribute("uv2", geometry.attributes.uv.clone());
};

export const markMaterialTextureRequest = (material) => {
  const requestToken = Symbol("planner-texture-request");
  material.userData = {
    ...material.userData,
    plannerTextureRequestToken: requestToken,
  };
  return requestToken;
};

const isMaterialTextureRequestCurrent = (material, requestToken) =>
  material?.userData?.plannerTextureRequestToken === requestToken;

const disposeTextureBundle = (textureBundle) => {
  Object.values(textureBundle || {}).forEach((texture) => {
    if (texture?.isTexture && texture.userData?.plannerDisposable) {
      texture.dispose();
    }
  });
};

const notifyPlannerTextureMapsUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("planner-texture-maps-updated"));
};

export const clearPlannerMaterialTextureMaps = (material) => {
  if (!material) return;

  [
    "map",
    "normalMap",
    "roughnessMap",
    "displacementMap",
    "aoMap",
    "metalnessMap",
    "bumpMap",
  ].forEach((slotName) => {
    const texture = material[slotName];
    if (texture?.isTexture && texture.userData?.plannerDisposable) {
      texture.dispose();
    }
    material[slotName] = null;
  });
};

export async function loadPlannerTextureBundle(
  textureDefinition,
  { width = 1, height = 1 } = {},
  mapSlots = PLANNER_TEXTURE_MAP_SLOTS,
) {
  if (!textureDefinition?.maps?.Color && !textureDefinition?.uri) {
    return null;
  }

  const rendering = textureDefinition.rendering || {};
  const lengthRepeatScale =
    Number(textureDefinition.lengthRepeatScale) > 0
      ? Number(textureDefinition.lengthRepeatScale)
      : Number(rendering.lengthRepeatScale) > 0
        ? Number(rendering.lengthRepeatScale)
        : 0.01;
  const heightRepeatScale =
    Number(textureDefinition.heightRepeatScale) > 0
      ? Number(textureDefinition.heightRepeatScale)
      : Number(rendering.heightRepeatScale) > 0
        ? Number(rendering.heightRepeatScale)
        : 0.01;

  const repeatX = Math.max(width * lengthRepeatScale, 0.0001);
  const repeatY = Math.max(height * heightRepeatScale, 0.0001);

  const loadedEntries = await Promise.all(
    mapSlots.map(async ([mapKey, materialSlot]) => {
      const mapUrl =
        textureDefinition?.maps?.[mapKey] ||
        (mapKey === "Color" ? textureDefinition?.uri : "");
      if (!mapUrl) {
        return null;
      }

      const sourceTexture = await loadSourceTexture(mapUrl, mapKey);
      const configuredTexture = cloneConfiguredTexture(sourceTexture, {
        mapKey,
        repeatX,
        repeatY,
      });

      return configuredTexture ? [materialSlot, configuredTexture] : null;
    }),
  );

  const textureBundle = loadedEntries.reduce((bundle, entry) => {
    if (entry) {
      bundle[entry[0]] = entry[1];
    }
    return bundle;
  }, {});

  if (!textureBundle.map) {
    return null;
  }

  textureBundle.normalScale = new Vector2(
    Number(rendering.normalScaleX) || 1,
    Number(rendering.normalScaleY) || 1,
  );
  textureBundle.displacementScale = Number(rendering.displacementScale) || 0;
  textureBundle.displacementBias = Number(rendering.displacementBias) || 0;
  textureBundle.aoMapIntensity = Number(rendering.aoMapIntensity) || 1;
  textureBundle.roughness = Number(rendering.roughness);
  textureBundle.metalness = Number(rendering.metalness) || 0;

  return textureBundle;
}

const applyTextureBundleToMaterial = (
  material,
  textureBundle,
  { clearMaps = true } = {},
) => {
  if (clearMaps) {
    clearPlannerMaterialTextureMaps(material);
  }

  [
    "map",
    "normalMap",
    "roughnessMap",
  ].forEach((slotName) => {
    if (textureBundle[slotName]) {
      if (!clearMaps) {
        const previousTexture = material[slotName];
        if (previousTexture?.isTexture && previousTexture.userData?.plannerDisposable) {
          previousTexture.dispose();
        }
      }
      material[slotName] = textureBundle[slotName];
    }
  });

  if (material.map) {
    material.color.set(0xffffff);
  }

  if (material.normalMap) {
    material.normalScale = textureBundle.normalScale;
  }

  if (material.displacementMap) {
    material.displacementScale = textureBundle.displacementScale;
    material.displacementBias = textureBundle.displacementBias;
  }

  if (material.aoMap) {
    material.aoMapIntensity = textureBundle.aoMapIntensity;
  }

  if (Number.isFinite(textureBundle.roughness)) {
    material.roughness = textureBundle.roughness;
  }

  if (Number.isFinite(textureBundle.metalness)) {
    material.metalness = textureBundle.metalness;
  }

  material.needsUpdate = true;
  notifyPlannerTextureMapsUpdated();
};

export async function applyPlannerTextureToMaterial(
  material,
  textureDefinition,
  dimensions,
  requestToken,
) {
  if (!material || !textureDefinition) {
    console.error("[TextureLoader] Missing material or texture definition", {
      hasMaterial: Boolean(material),
      textureId: textureDefinition?.id || null,
    });
    return false;
  }

  const colorBundle = await loadPlannerTextureBundle(
    textureDefinition,
    dimensions,
    [["Color", "map"]],
  );

  if (!colorBundle) {
    console.error("[TextureLoader] Failed to load color bundle", {
      textureId: textureDefinition?.id || null,
      dimensions,
    });
    return false;
  }

  if (!isMaterialTextureRequestCurrent(material, requestToken)) {
    console.warn("[TextureLoader] Discarding stale texture request", {
      textureId: textureDefinition?.id || null,
    });
    disposeTextureBundle(colorBundle);
    return false;
  }

  applyTextureBundleToMaterial(material, colorBundle, { clearMaps: true });

  const detailSlots = PLANNER_TEXTURE_MAP_SLOTS.filter(
    ([mapKey]) => mapKey !== "Color" && textureDefinition?.maps?.[mapKey],
  );

  if (detailSlots.length > 0) {
    loadPlannerTextureBundle(textureDefinition, dimensions, detailSlots)
      .then((detailBundle) => {
        if (!detailBundle) return;
        if (!isMaterialTextureRequestCurrent(material, requestToken)) {
          console.warn("[TextureLoader] Discarding stale detail map request", {
            textureId: textureDefinition?.id || null,
          });
          disposeTextureBundle(detailBundle);
          return;
        }
        applyTextureBundleToMaterial(material, detailBundle, {
          clearMaps: false,
        });
      })
      .catch((error) => {
        console.error("[TextureLoader] Failed to apply detail texture maps", error);
      });
  }

  return true;
}
