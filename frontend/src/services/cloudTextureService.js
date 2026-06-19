import axios from "../config/axios.config";
import { canonicalizeAssetUrl } from "../utils/asset-url";

export const CLOUD_TEXTURE_MAP_KEYS = [
  "Color",
  "NormalGL",
  "Roughness",
];
const CLOUD_TEXTURE_MAP_KEY_ALIASES = {
  Color: ["Color", "color", "baseColor", "albedo", "diffuse", "colorUrl"],
  NormalGL: ["NormalGL", "normalGL", "normal", "normalMap", "normalUrl"],
  Roughness: ["Roughness", "roughness", "roughnessMap", "roughnessUrl"],
};

export const CLOUD_TEXTURE_PLACEMENTS = ["wall", "floor", "both"];

const TEXTURE_PLACEMENT_SET = new Set(CLOUD_TEXTURE_PLACEMENTS);
const placementTextureCache = new Map();
const placementTexturePromiseCache = new Map();
const textureCategoryCache = new Map();
const textureCategoryPromiseCache = new Map();
let textureCategoriesCache = null;
let textureCategoriesPromise = null;
let allCloudTexturesCache = null;
let allCloudTexturesPromise = null;
const CLOUD_TEXTURE_REQUEST_TIMEOUT_MS = 20000;
const CLOUD_TEXTURE_REQUEST_RETRY_DELAY_MS = 650;

const logCloudTextureTrace = () => {};

const wait = (delayMs) =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });

const shouldRetryCloudRequest = (error) => {
  const status = error?.response?.status;
  return !status || status === 408 || status === 429 || status >= 500;
};

const requestCloudTexturesBackend = async (url, config = {}, logPayload = {}) => {
  const startedAt = Date.now();
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    logCloudTextureTrace("request:sent-to-backend", {
      url,
      params: config.params || {},
      attempt,
      timeoutMs: CLOUD_TEXTURE_REQUEST_TIMEOUT_MS,
      ...logPayload,
    });

    try {
      const response = await axios.get(url, {
        ...config,
        timeout: CLOUD_TEXTURE_REQUEST_TIMEOUT_MS,
      });

      logCloudTextureTrace("response:received-from-backend", {
        url,
        params: config.params || {},
        attempt,
        status: response?.status || null,
        durationMs: Date.now() - startedAt,
        assetCount: getResponseItems(response?.data).length,
        ...logPayload,
      });
      return response;
    } catch (error) {
      lastError = error;
      logCloudTextureTrace("request:error", {
        url,
        params: config.params || {},
        attempt,
        status: error?.response?.status || null,
        message: error?.message || "Unknown error",
        backendMessage: error?.response?.data?.message || null,
        ...logPayload,
      });

      if (attempt >= 2 || !shouldRetryCloudRequest(error)) {
        throw error;
      }

      await wait(CLOUD_TEXTURE_REQUEST_RETRY_DELAY_MS);
    }
  }

  throw lastError;
};

const getResponseItems = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  return Array.isArray(responseData?.items) ? responseData.items : [];
};

const getResponsePagination = (responseData, fallbackCount = 0) => {
  if (responseData?.pagination) return responseData.pagination;
  return {
    page: 1,
    limit: fallbackCount,
    total: fallbackCount,
    hasMore: false,
  };
};

const canonicalizeImmutableAssetUrl = (assetUrl) => {
  return canonicalizeAssetUrl(assetUrl, {
    preferBackendOriginForRelative: true,
  });
};

const buildCloudinaryThumbnailUrl = (assetUrl) => {
  const canonicalUrl = canonicalizeImmutableAssetUrl(assetUrl);
  if (!canonicalUrl) return "";

  try {
    const parsedUrl = new URL(canonicalUrl);
    if (!/\.cloudinary\.com$/i.test(parsedUrl.hostname)) {
      return canonicalUrl;
    }

    const uploadMarker = "/image/upload/";
    const uploadIndex = parsedUrl.pathname.indexOf(uploadMarker);
    if (uploadIndex === -1) {
      return canonicalUrl;
    }

    const pathPrefix = parsedUrl.pathname.slice(0, uploadIndex + uploadMarker.length);
    const assetPath = parsedUrl.pathname.slice(uploadIndex + uploadMarker.length);
    parsedUrl.pathname = `${pathPrefix}f_auto,q_auto,w_256,h_256,c_fill/${assetPath}`;
    return parsedUrl.toString();
  } catch (_) {
    return canonicalUrl;
  }
};

const normalizePlacement = (value) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  return TEXTURE_PLACEMENT_SET.has(normalizedValue) ? normalizedValue : "both";
};

const normalizePositiveNumber = (value, fallback) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : fallback;
};

const normalizeNumber = (value, fallback) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getMapUrl = (maps, mapKey) => {
  const candidateKeys = CLOUD_TEXTURE_MAP_KEY_ALIASES[mapKey] || [mapKey];
  for (const candidateKey of candidateKeys) {
    const normalizedUrl = canonicalizeImmutableAssetUrl(maps?.[candidateKey]);
    if (normalizedUrl) return normalizedUrl;
  }
  return "";
};

const normalizeMaps = (maps) =>
  CLOUD_TEXTURE_MAP_KEYS.reduce((normalizedMaps, mapKey) => {
    const normalizedUrl = getMapUrl(maps, mapKey);
    if (normalizedUrl) {
      normalizedMaps[mapKey] = normalizedUrl;
    }
    return normalizedMaps;
  }, {});

const getTextureIdentityKey = (texture) =>
  [
    String(texture?.id || texture?.textureKey || "").trim().toLowerCase(),
    String(texture?.category || "other").trim().toLowerCase(),
  ].join(":");

const dedupeCloudTextures = (textures = []) => {
  const seenTextureKeys = new Set();
  return textures.filter((texture) => {
    const textureKey = getTextureIdentityKey(texture);
    if (!textureKey || seenTextureKeys.has(textureKey)) return false;
    seenTextureKeys.add(textureKey);
    return true;
  });
};

export function normalizeCloudTexture(rawTexture) {
  const textureMaps =
    rawTexture?.maps ||
    rawTexture?.assets ||
    rawTexture?.textureMaps ||
    rawTexture ||
    {};
  const id = String(
    rawTexture?.id ||
      rawTexture?.textureKey ||
      rawTexture?._id ||
      "",
  ).trim();
  const placement = normalizePlacement(rawTexture?.placement);
  const maps = normalizeMaps(textureMaps);
  const rendering = rawTexture?.rendering || {};
  const colorMapUrl = maps.Color || "";
  const thumbnailUrl =
    canonicalizeImmutableAssetUrl(rawTexture?.thumbnailUrl) ||
    buildCloudinaryThumbnailUrl(colorMapUrl);

  return {
    id,
    textureKey: id,
    name: String(rawTexture?.displayName || id).trim(),
    displayName: String(rawTexture?.displayName || id).trim(),
    category: String(rawTexture?.category || "other")
      .trim()
      .toLowerCase(),
    placement,
    source: String(rawTexture?.source || "").trim(),
    license: String(rawTexture?.license || "").trim(),
    resolution: String(rawTexture?.resolution || "").trim(),
    maps,
    uri: maps.Color || "",
    thumbnailUrl,
    image: thumbnailUrl,
    prototype: "texture",
    isCloudTexture: true,
    targetType: "both",
    rendering: {
      lengthRepeatScale: normalizePositiveNumber(
        rendering?.lengthRepeatScale,
        0.01,
      ),
      heightRepeatScale: normalizePositiveNumber(
        rendering?.heightRepeatScale,
        0.01,
      ),
      normalScaleX: normalizePositiveNumber(rendering?.normalScaleX, 1),
      normalScaleY: normalizePositiveNumber(rendering?.normalScaleY, 1),
      displacementScale: normalizeNumber(rendering?.displacementScale, 0),
      displacementBias: normalizeNumber(rendering?.displacementBias, 0),
      aoMapIntensity: normalizePositiveNumber(rendering?.aoMapIntensity, 1),
      roughness: normalizePositiveNumber(rendering?.roughness, 1),
      metalness: normalizeNumber(rendering?.metalness, 0),
    },
  };
}

const readPropertyValue = (source, key) => {
  if (!source) return "";
  if (typeof source.get === "function") {
    return String(source.get(key) || "").trim();
  }

  return String(source[key] || "").trim();
};

const readCollectionValues = (collection) => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.valueSeq === "function") {
    return collection.valueSeq().toArray();
  }

  return Object.values(collection);
};

export function extractCloudTextureKeysFromSceneData(sceneData) {
  const textureKeys = new Set();
  const layers = readCollectionValues(sceneData?.layers);

  layers.forEach((layer) => {
    readCollectionValues(layer?.lines).forEach((line) => {
      const properties = line?.properties || {};
      ["textureA", "textureB"].forEach((propertyName) => {
        const textureKey = readPropertyValue(properties, propertyName);
        if (textureKey && textureKey !== "none") {
          textureKeys.add(textureKey);
        }
      });
    });

    readCollectionValues(layer?.areas).forEach((area) => {
      const textureKey = readPropertyValue(area?.properties || {}, "texture");
      if (textureKey && textureKey !== "none") {
        textureKeys.add(textureKey);
      }
    });
  });

  return Array.from(textureKeys);
}

export async function fetchCloudTextureCategories(options = {}) {
  const { force = false, placement = "" } = options;
  const normalizedPlacement = placement ? normalizePlacement(placement) : "";
  const cacheKey = normalizedPlacement || "all";

  if (!force && Array.isArray(textureCategoriesCache) && cacheKey === "all") {
    return textureCategoriesCache;
  }

  if (!force && textureCategoriesPromise && cacheKey === "all") {
    return textureCategoriesPromise;
  }

  const promise = requestCloudTexturesBackend(
    "/design2D3D/textures/categories",
    {
      params: normalizedPlacement ? { placement: normalizedPlacement } : {},
    },
    { requestType: "texture-categories", placement: normalizedPlacement || null },
  ).then((response) => {
    const payload = Array.isArray(response?.data) ? response.data : [];
    const categories = Array.from(
      new Set(
        payload
          .map((entry) =>
            String(
              typeof entry === "string"
                ? entry
                : entry?.key || entry?.id || entry?.category || "",
            )
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    ).sort();

    if (cacheKey === "all") {
      textureCategoriesCache = categories;
      textureCategoriesPromise = null;
    }

    return categories;
  }).catch((error) => {
    if (cacheKey === "all") {
      textureCategoriesPromise = null;
    }
    throw error;
  });

  if (cacheKey === "all") {
    textureCategoriesPromise = promise;
  }

  return promise;
}

export async function fetchCloudTexturesByCategoryPage(category, options = {}) {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(options.page || 1, 10) || 1);
  const limit = Math.max(1, Number.parseInt(options.limit || 48, 10) || 48);
  const force = Boolean(options.force);
  const placement = options.placement ? normalizePlacement(options.placement) : "";
  const cacheKey = `${normalizedCategory}:${placement || "all"}:${page}:${limit}`;

  if (!normalizedCategory) {
    return {
      textures: [],
      pagination: { page, limit, total: 0, hasMore: false },
    };
  }

  if (!force && textureCategoryCache.has(cacheKey)) {
    return textureCategoryCache.get(cacheKey);
  }

  if (!force && textureCategoryPromiseCache.has(cacheKey)) {
    return textureCategoryPromiseCache.get(cacheKey);
  }

  const promise = requestCloudTexturesBackend(
    "/design2D3D/textures",
    {
      params: {
        category: normalizedCategory,
        page,
        limit,
        ...(placement ? { placement } : {}),
      },
    },
    {
      requestType: "texture-category-page",
      category: normalizedCategory,
      placement: placement || null,
      page,
      limit,
    },
  )
    .then((response) => {
      const payload = getResponseItems(response?.data);
      const textures = dedupeCloudTextures(
        payload
          .map((texture) => normalizeCloudTexture(texture))
          .filter((texture) => texture.id && (texture.maps.Color || texture.uri)),
      );
      const result = {
        textures,
        pagination: getResponsePagination(response?.data, textures.length),
      };

      textureCategoryCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      textureCategoryPromiseCache.delete(cacheKey);
    });

  textureCategoryPromiseCache.set(cacheKey, promise);
  return promise;
}

export async function fetchCloudTexturesByIds(textureIds = [], options = {}) {
  const ids = Array.from(
    new Set(textureIds.map((id) => String(id || "").trim()).filter(Boolean)),
  );

  if (ids.length === 0) return [];

  const response = await requestCloudTexturesBackend(
    "/design2D3D/textures",
    {
      params: { ids: ids.join(",") },
    },
    { requestType: "texture-ids", idsCount: ids.length },
  );
  return dedupeCloudTextures(
    getResponseItems(response?.data)
      .map((texture) => normalizeCloudTexture(texture))
      .filter((texture) => texture.id && (texture.maps.Color || texture.uri)),
  );
}

export async function fetchAllCloudTextures(options = {}) {
  const { force = false } = options;

  if (!force && Array.isArray(allCloudTexturesCache)) {
    logCloudTextureTrace("all:cache-hit", {
      count: allCloudTexturesCache.length,
    });
    return allCloudTexturesCache;
  }

  if (!force && allCloudTexturesPromise) {
    logCloudTextureTrace("all:promise-hit");
    return allCloudTexturesPromise;
  }

  logCloudTextureTrace("all:cache-miss", { force });
  const promise = requestCloudTexturesBackend(
    "/design2D3D/textures",
    {},
    { requestType: "all-textures" },
  )
    .then((response) => {
      const payload = getResponseItems(response?.data);
      const textures = dedupeCloudTextures(
        payload
          .map((texture) => normalizeCloudTexture(texture))
          .filter((texture) => texture.id && (texture.maps.Color || texture.uri)),
      );

      placementTextureCache.set(
        "wall",
        textures.filter(
          (texture) =>
            texture.placement === "wall" || texture.placement === "both",
        ),
      );
      placementTextureCache.set(
        "floor",
        textures.filter(
          (texture) =>
            texture.placement === "floor" || texture.placement === "both",
        ),
      );
      placementTextureCache.set(
        "both",
        textures.filter((texture) => texture.placement === "both"),
      );

      allCloudTexturesCache = textures;
      allCloudTexturesPromise = null;
      logCloudTextureTrace("all:response", {
        payloadCount: payload.length,
        acceptedCount: textures.length,
        wallCount: placementTextureCache.get("wall")?.length || 0,
        floorCount: placementTextureCache.get("floor")?.length || 0,
      });
      return textures;
    })
    .catch((error) => {
      allCloudTexturesPromise = null;
      logCloudTextureTrace("all:error", {
        status: error?.response?.status || null,
        message: error?.message || "Unknown error",
        backendMessage: error?.response?.data?.message || null,
      });

      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch planner textures.";
      throw new Error(backendMessage);
    });

  allCloudTexturesPromise = promise;
  return promise;
}

export async function fetchCloudTexturesByPlacement(
  placement,
  options = {},
) {
  const normalizedPlacement = normalizePlacement(placement);
  const { force = false } = options;

  if (!force && placementTextureCache.has(normalizedPlacement)) {
    logCloudTextureTrace("placement:cache-hit", {
      placement: normalizedPlacement,
      count: placementTextureCache.get(normalizedPlacement)?.length || 0,
    });
    return placementTextureCache.get(normalizedPlacement);
  }

  if (!force && Array.isArray(allCloudTexturesCache)) {
    const filteredTextures = allCloudTexturesCache.filter((texture) => {
      if (normalizedPlacement === "both") {
        return texture.placement === "both";
      }

      return (
        texture.placement === normalizedPlacement || texture.placement === "both"
      );
    });
    placementTextureCache.set(normalizedPlacement, filteredTextures);
    logCloudTextureTrace("placement:derived-from-all-cache", {
      placement: normalizedPlacement,
      count: filteredTextures.length,
    });
    return filteredTextures;
  }

  if (!force && placementTexturePromiseCache.has(normalizedPlacement)) {
    logCloudTextureTrace("placement:promise-hit", {
      placement: normalizedPlacement,
    });
    return placementTexturePromiseCache.get(normalizedPlacement);
  }

  logCloudTextureTrace("placement:cache-miss", {
    placement: normalizedPlacement,
    force,
  });
  const promise = requestCloudTexturesBackend(
    "/design2D3D/textures",
    {
      params: { placement: normalizedPlacement },
    },
    { requestType: "placement-textures", placement: normalizedPlacement },
  )
    .then((response) => {
      const payload = getResponseItems(response?.data);
      return dedupeCloudTextures(
        payload
          .map((texture) => normalizeCloudTexture(texture))
          .filter((texture) => texture.id && (texture.maps.Color || texture.uri)),
      );
    })
    .catch((error) => {
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch planner textures.";
      throw new Error(backendMessage);
    })
    .then((textures) => {
      placementTextureCache.set(normalizedPlacement, textures);
      placementTexturePromiseCache.delete(normalizedPlacement);

      if (Array.isArray(allCloudTexturesCache)) {
        const untouchedTextures = allCloudTexturesCache.filter((texture) => {
          if (normalizedPlacement === "both") {
            return texture.placement !== "both";
          }

          if (normalizedPlacement === "wall") {
            return texture.placement === "floor";
          }

          return texture.placement === "wall";
        });

        allCloudTexturesCache = [...untouchedTextures, ...textures];
      }

      return textures;
    })
    .catch((error) => {
      placementTexturePromiseCache.delete(normalizedPlacement);
      throw error;
    });

  placementTexturePromiseCache.set(normalizedPlacement, promise);
  return promise;
}
