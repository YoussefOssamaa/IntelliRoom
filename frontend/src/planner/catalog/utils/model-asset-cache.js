import { normalizeAssetCacheKey, preloadGLB } from "./load-gltf";
import { buildResilientAssetUrlCandidates } from "../../../utils/asset-url";

const topViewImageCache = new Map();
const topViewPromiseCache = new Map();
const preloadTimerCache = new Map();

export function preloadTopViewImage(topViewUrl) {
  const cacheKey = normalizeAssetCacheKey(topViewUrl);
  if (!cacheKey || typeof Image === "undefined") {
    return Promise.resolve(null);
  }

  if (topViewImageCache.has(cacheKey)) {
    return Promise.resolve(topViewImageCache.get(cacheKey));
  }

  if (topViewPromiseCache.has(cacheKey)) {
    return topViewPromiseCache.get(cacheKey);
  }

  const sourceCandidates = buildResilientAssetUrlCandidates(topViewUrl, {
    includeBackendOrigin: true,
    includeApiBasePathVariant: true,
  });

  const promise = new Promise((resolve, reject) => {
    let candidateIndex = 0;
    const candidatesToTry =
      sourceCandidates.length > 0 ? sourceCandidates : [cacheKey];

    const tryLoadImage = () => {
      const image = new Image();
      image.decoding = "async";

      image.onload = async () => {
        try {
          if (typeof image.decode === "function") {
            await image.decode();
          }
        } catch (_) {
          // Ignore decode failures; the image is already loaded.
        }

        topViewImageCache.set(cacheKey, image);
        topViewPromiseCache.delete(cacheKey);
        resolve(image);
      };

      image.onerror = (error) => {
        candidateIndex += 1;
        if (candidateIndex < candidatesToTry.length) {
          tryLoadImage();
          return;
        }

        topViewPromiseCache.delete(cacheKey);
        reject(error);
      };

      image.src = candidatesToTry[candidateIndex];
    };

    tryLoadImage();
  });

  topViewPromiseCache.set(cacheKey, promise);
  return promise;
}

export function preloadPlannerModelAssets(model) {
  const glbPromise = model?.modelUrl
    ? preloadGLB(model.modelUrl, { isBinary: true })
    : Promise.resolve(null);
  const topViewPromise = model?.topViewUrl
    ? preloadTopViewImage(model.topViewUrl)
    : Promise.resolve(null);

  return Promise.all([glbPromise, topViewPromise]);
}

export function schedulePlannerModelAssetPreload(model, delayMs = 90) {
  const preloadKey =
    model?.type || model?.id || normalizeAssetCacheKey(model?.modelUrl);
  if (!preloadKey) return;

  if (preloadTimerCache.has(preloadKey)) {
    clearTimeout(preloadTimerCache.get(preloadKey));
  }

  const timerId = window.setTimeout(() => {
    preloadTimerCache.delete(preloadKey);
    preloadPlannerModelAssets(model).catch(() => {
      // Keep selection responsive even when an asset fails to warm.
    });
  }, delayMs);

  preloadTimerCache.set(preloadKey, timerId);
}
