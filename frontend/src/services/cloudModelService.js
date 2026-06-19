import axios from "../config/axios.config";
 import { canonicalizeAssetUrl } from "../utils/asset-url";

const categoryModelsCache = new Map();
const categoryModelsPromiseCache = new Map();
const categoryModelPageCache = new Map();
const categoryModelPagePromiseCache = new Map();
let allCloudModelsCache = null;
let allCloudModelsPromise = null;
let cloudModelCategoriesCache = null;
let cloudModelCategoriesPromise = null;
let cloudModelCategoryTreeCache = null;
let cloudModelCategoryTreePromise = null;
const CLOUD_MODEL_REQUEST_TIMEOUT_MS = 20000;
const CLOUD_MODEL_REQUEST_RETRY_DELAY_MS = 650;
export const CLOUD_MODEL_FALLBACK_CATEGORIES = [
  "bedroom",
  "living_room",
  "kitchen",
  "dining_room",
  "office",
  "bathroom",
  "outdoor",
  "hallway",
  "storage",
  "lighting",
  "not_furniture",
  "other_furniture",
];

const logCloudModelTrace = () => {};

const wait = (delayMs) =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });

const shouldRetryCloudRequest = (error) => {
  const status = error?.response?.status;
  return !status || status === 408 || status === 429 || status >= 500;
};

const requestCloudModelsBackend = async (url, config = {}, logPayload = {}) => {
  const startedAt = Date.now();
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    logCloudModelTrace("request:sent-to-backend", {
      url,
      params: config.params || {},
      attempt,
      timeoutMs: CLOUD_MODEL_REQUEST_TIMEOUT_MS,
      ...logPayload,
    });

    try {
      const response = await axios.get(url, {
        ...config,
        timeout: CLOUD_MODEL_REQUEST_TIMEOUT_MS,
      });

      logCloudModelTrace("response:received-from-backend", {
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
      logCloudModelTrace("request:error", {
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

      await wait(CLOUD_MODEL_REQUEST_RETRY_DELAY_MS);
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

const CATEGORY_ALIASES = new Map([
  ["livingroom", "living_room"],
  ["diningroom", "dining_room"],
  ["other furniture", "other_furniture"],
]);

const toLabel = (value) =>
  String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());

const toFiniteMeters = (value, fallback = 1) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.round(numericValue * 1000) / 1000;
};

export function normalizeCloudModelCategory(value) {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  return CATEGORY_ALIASES.get(normalizedValue) || normalizedValue;
}

const toCategoryKey = (value) => normalizeCloudModelCategory(value);

export function normalizeCloudModelSubcategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
}

export function getCloudModelCategoryCacheKey(category, subCategory = "") {
  const normalizedCategory = normalizeCloudModelCategory(category);
  const normalizedSubCategory = normalizeCloudModelSubcategory(subCategory);
  return normalizedSubCategory
    ? `${normalizedCategory}::${normalizedSubCategory}`
    : normalizedCategory;
}

const normalizeCategoryTreeEntry = (entry) => {
  if (typeof entry === "string") {
    const key = toCategoryKey(entry);
    return key ? { key, label: toLabel(key), subcategories: [] } : null;
  }

  const key = toCategoryKey(entry?.key || entry?.id || entry?.category || "");
  if (!key) return null;

  const rawSubcategories = Array.isArray(entry?.subcategories)
    ? entry.subcategories
    : Array.isArray(entry?.sub_categories)
      ? entry.sub_categories
      : [];
  const subcategories = Array.from(
    new Map(
      rawSubcategories
        .map((subCategory) => {
          const subCategoryKey = normalizeCloudModelSubcategory(
            typeof subCategory === "string"
              ? subCategory
              : subCategory?.key || subCategory?.id || subCategory?.sub_category || "",
          );
          if (!subCategoryKey) return null;

          return [
            subCategoryKey,
            {
              key: subCategoryKey,
              label:
                typeof subCategory === "object" && subCategory?.label
                  ? String(subCategory.label)
                  : toLabel(subCategoryKey),
            },
          ];
        })
        .filter(Boolean),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label));

  return {
    key,
    label: entry?.label ? String(entry.label) : toLabel(key),
    subcategories,
  };
};

const getCategoryTreeFromResponse = (responseData) =>
  getResponseItems(responseData)
    .map((entry) => normalizeCategoryTreeEntry(entry))
    .filter(Boolean)
    .sort((left, right) => left.label.localeCompare(right.label));

export async function fetchCloudModelCategoryTree(options = {}) {
  const { force = false } = options;

  if (!force && Array.isArray(cloudModelCategoryTreeCache)) {
    return cloudModelCategoryTreeCache;
  }

  if (!force && cloudModelCategoryTreePromise) {
    return cloudModelCategoryTreePromise;
  }

  const promise = requestCloudModelsBackend(
    "/design2D3D/assets/categories",
    {},
    { requestType: "category-tree" },
  )
    .then((response) => {
      const categoryTree = getCategoryTreeFromResponse(response?.data);
      const resolvedCategoryTree =
        categoryTree.length > 0
          ? categoryTree
          : CLOUD_MODEL_FALLBACK_CATEGORIES.map((category) => ({
              key: category,
              label: toLabel(category),
              subcategories: [],
            }));

      cloudModelCategoryTreeCache = resolvedCategoryTree;
      cloudModelCategoriesCache = resolvedCategoryTree.map((entry) => entry.key);
      cloudModelCategoryTreePromise = null;
      return resolvedCategoryTree;
    })
    .catch((error) => {
      if (error?.response?.status === 404) {
        const fallbackTree = CLOUD_MODEL_FALLBACK_CATEGORIES.map((category) => ({
          key: category,
          label: toLabel(category),
          subcategories: [],
        }));
        cloudModelCategoryTreeCache = fallbackTree;
        cloudModelCategoriesCache = fallbackTree.map((entry) => entry.key);
        cloudModelCategoryTreePromise = null;
        return fallbackTree;
      }

      cloudModelCategoryTreePromise = null;
      throw error;
    });

  cloudModelCategoryTreePromise = promise;
  return promise;
}

export async function fetchCloudModelCategories(options = {}) {
  const { force = false } = options;
  logCloudModelTrace("categories:called", { force });

  if (!force && Array.isArray(cloudModelCategoriesCache)) {
    const cachedCategories =
      cloudModelCategoriesCache.length > 0
        ? cloudModelCategoriesCache
        : CLOUD_MODEL_FALLBACK_CATEGORIES;
    logCloudModelTrace("categories:cache-hit", {
      count: cachedCategories.length,
      fallbackUsed: cloudModelCategoriesCache.length === 0,
      categories: cachedCategories,
    });
    return cachedCategories;
  }

  if (!force && cloudModelCategoriesPromise) {
    logCloudModelTrace("categories:promise-hit");
    return cloudModelCategoriesPromise;
  }

  logCloudModelTrace("categories:cache-miss", { force });
  const promise = requestCloudModelsBackend(
    "/design2D3D/assets/categories",
    {},
    { requestType: "categories" },
  )
    .then((response) => {
      const payload = getResponseItems(response?.data);
      const categoryTree = getCategoryTreeFromResponse(response?.data);
      const categories = Array.from(
        new Set(categoryTree.map((entry) => entry.key).filter(Boolean)),
      ).sort();
      const resolvedCategories =
        categories.length > 0 ? categories : CLOUD_MODEL_FALLBACK_CATEGORIES;

      cloudModelCategoriesCache = resolvedCategories;
      cloudModelCategoryTreeCache =
        categoryTree.length > 0
          ? categoryTree
          : resolvedCategories.map((category) => ({
              key: category,
              label: toLabel(category),
              subcategories: [],
            }));
      cloudModelCategoriesPromise = null;
      logCloudModelTrace("categories:response", {
        status: response?.status || null,
        payloadCount: payload.length,
        normalizedCount: categories.length,
        fallbackUsed: categories.length === 0,
        categories: resolvedCategories,
      });
      return resolvedCategories;
    })
    .catch((error) => {
      if (error?.response?.status === 404) {
        cloudModelCategoriesCache = CLOUD_MODEL_FALLBACK_CATEGORIES;
        cloudModelCategoriesPromise = null;
        logCloudModelTrace("categories:not-found:fallback-static", {
          categories: CLOUD_MODEL_FALLBACK_CATEGORIES,
        });
        return CLOUD_MODEL_FALLBACK_CATEGORIES;
      }

      cloudModelCategoriesPromise = null;
      logCloudModelTrace("categories:error", {
        status: error?.response?.status || null,
        message: error?.message || "Unknown error",
        backendMessage: error?.response?.data?.message || null,
      });

      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch cloud model categories.";
      throw new Error(backendMessage);
    });

  cloudModelCategoriesPromise = promise;
  return promise;
}

export function canonicalizeImmutableAssetUrl(assetUrl) {
  return canonicalizeAssetUrl(assetUrl, {
    preferBackendOriginForRelative: true,
  });
}

const slugifyModelToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "model";

export function normalizeCloudModel(rawModel) {
  const assetUrls = rawModel?.assets || {};
  const metadata = rawModel?.metadata || {};
  const dimensionsSource = metadata?.dimensions || {};
  const category = normalizeCloudModelCategory(rawModel?.category);
  const subCategory = normalizeCloudModelSubcategory(
    rawModel?.sub_category || rawModel?.subCategory,
  );
  const id = String(rawModel?._id || rawModel?.id || "").trim();
  const name = String(rawModel?.name || "Untitled Model").trim();
  const resolvedModelUrl =
    assetUrls?.modelUrl ||
    rawModel?.modelUrl ||
    assetUrls?.url ||
    rawModel?.url ||
    "";
  const resolvedThumbnailUrl =
    assetUrls?.thumbnailUrl ||
    assetUrls?.thumbnail ||
    rawModel?.thumbnailUrl ||
    rawModel?.thumbnail ||
    assetUrls?.previewUrl ||
    rawModel?.previewUrl ||
    assetUrls?.image ||
    rawModel?.image ||
    assetUrls?.topViewUrl ||
    rawModel?.topViewUrl ||
    "";
  const resolvedTopViewUrl =
    assetUrls?.topViewUrl ||
    assetUrls?.topViewURL ||
    rawModel?.topViewUrl ||
    rawModel?.topViewURL ||
    resolvedThumbnailUrl ||
    "";
  const type =
    String(rawModel?.type || "").trim() ||
    `cloud-model-${slugifyModelToken(id || `${category}-${subCategory}-${name}`)}`;

  return {
    id,
    type,
    name,
    category,
    subCategory,
    sub_category: subCategory,
    modelUrl: canonicalizeImmutableAssetUrl(resolvedModelUrl),
    thumbnailUrl: canonicalizeImmutableAssetUrl(resolvedThumbnailUrl),
    topViewUrl: canonicalizeImmutableAssetUrl(resolvedTopViewUrl),
    metadata: {
      ...metadata,
      dimensions: {
        width: toFiniteMeters(dimensionsSource?.width),
        height: toFiniteMeters(dimensionsSource?.height),
        depth: toFiniteMeters(dimensionsSource?.depth),
      },
    },
    tags: Array.isArray(rawModel?.tags) ? rawModel.tags : [],
    prototype: "items",
    isCloudModel: true,
    image: canonicalizeImmutableAssetUrl(resolvedThumbnailUrl),
  };
}

export function createPlannerItemAssetPayload(rawModel) {
  const model = normalizeCloudModel(rawModel);

  return {
    assetId: model.id,
    displayName: model.name,
    category: model.category,
    sub_category: model.subCategory,
    modelUrl: model.modelUrl,
    thumbnailUrl: model.thumbnailUrl,
    topViewUrl: model.topViewUrl,
    metadata: model.metadata,
    asset: {
      id: model.id,
      name: model.name,
      category: model.category,
      sub_category: model.subCategory,
      modelUrl: model.modelUrl,
      thumbnailUrl: model.thumbnailUrl,
      topViewUrl: model.topViewUrl,
      metadata: model.metadata,
    },
  };
}

export function extractCloudModelTypesFromSceneData(sceneData) {
  const cloudModelTypes = new Set();
  const layers = Array.isArray(sceneData?.layers)
    ? sceneData.layers
    : Object.values(sceneData?.layers || {});

  layers.forEach((layer) => {
    const items = Array.isArray(layer?.items)
      ? layer.items
      : Object.values(layer?.items || {});

    items.forEach((item) => {
      const itemType = String(item?.type || "").trim();
      if (itemType.startsWith("cloud-model-")) {
        cloudModelTypes.add(itemType);
      }
    });
  });

  return Array.from(cloudModelTypes);
}

export async function fetchAllCloudModels(options = {}) {
  const { force = false } = options;
  logCloudModelTrace("all:called", { force });

  if (!force && Array.isArray(allCloudModelsCache)) {
    logCloudModelTrace("all:cache-hit", { count: allCloudModelsCache.length });
    return allCloudModelsCache;
  }

  if (!force && allCloudModelsPromise) {
    logCloudModelTrace("all:promise-hit");
    return allCloudModelsPromise;
  }

  logCloudModelTrace("all:cache-miss", { force });
  const promise = requestCloudModelsBackend(
    "/design2D3D/assets",
    {},
    { requestType: "all-models" },
  )
    .then((response) => {
      const payload = getResponseItems(response?.data);
      const normalizedModels = payload.map((model) => normalizeCloudModel(model));
      const models = normalizedModels.filter((model) => model.modelUrl);
      const rejectedModels = normalizedModels.filter(
        (model) => !model.modelUrl,
      );

      const modelsByCategory = new Map();
      models.forEach((model) => {
        if (!modelsByCategory.has(model.category)) {
          modelsByCategory.set(model.category, []);
        }
        modelsByCategory.get(model.category).push(model);
      });

      modelsByCategory.forEach((modelsInCategory, category) => {
        categoryModelsCache.set(category, modelsInCategory);
      });
      cloudModelCategoriesCache = Array.from(modelsByCategory.keys()).sort();
      cloudModelCategoryTreeCache = cloudModelCategoriesCache.map((category) => ({
        key: category,
        label: toLabel(category),
        subcategories: Array.from(
          new Set(
            (modelsByCategory.get(category) || [])
              .map((model) => model.subCategory)
              .filter(Boolean),
          ),
        )
          .sort()
          .map((subCategory) => ({
            key: subCategory,
            label: toLabel(subCategory),
          })),
      }));

      allCloudModelsCache = models;
      allCloudModelsPromise = null;
      logCloudModelTrace("all:response", {
        status: response?.status || null,
        payloadCount: payload.length,
        normalizedCount: normalizedModels.length,
        acceptedCount: models.length,
        rejectedCount: rejectedModels.length,
        categories: Array.from(modelsByCategory.keys()).sort(),
        firstAccepted: models[0]
          ? {
              id: models[0].id,
              name: models[0].name,
              category: models[0].category,
              hasModelUrl: Boolean(models[0].modelUrl),
              hasThumbnailUrl: Boolean(models[0].thumbnailUrl),
              hasTopViewUrl: Boolean(models[0].topViewUrl),
            }
          : null,
        firstRejected: rejectedModels[0]
          ? {
              id: rejectedModels[0].id,
              name: rejectedModels[0].name,
              category: rejectedModels[0].category,
              hasModelUrl: Boolean(rejectedModels[0].modelUrl),
              hasTopViewUrl: Boolean(rejectedModels[0].topViewUrl),
            }
          : null,
      });
      return models;
    })
    .catch((error) => {
      allCloudModelsPromise = null;
      logCloudModelTrace("all:error", {
        status: error?.response?.status || null,
        message: error?.message || "Unknown error",
        backendMessage: error?.response?.data?.message || null,
      });

      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch cloud model metadata.";
      throw new Error(backendMessage);
    });

  allCloudModelsPromise = promise;
  return promise;
}

export async function fetchCloudModelsByTypes(types = []) {
  const normalizedTypes = Array.from(
    new Set(
      types
        .map((type) => String(type || "").trim())
        .filter((type) => type.startsWith("cloud-model-")),
    ),
  );

  if (normalizedTypes.length === 0) return [];

  const allModels = await fetchAllCloudModels();
  const typeSet = new Set(normalizedTypes);
  return allModels.filter((model) => typeSet.has(model.type));
}

export async function fetchCloudModelsByCategoryPage(category, options = {}) {
  const normalizedCategory = normalizeCloudModelCategory(category);
  const normalizedSubCategory = normalizeCloudModelSubcategory(
    options.subCategory || options.sub_category,
  );
  const page = Math.max(1, Number.parseInt(options.page || 1, 10) || 1);
  const limit = Math.max(1, Number.parseInt(options.limit || 48, 10) || 48);
  const force = Boolean(options.force);
  const categoryCacheKey = getCloudModelCategoryCacheKey(
    normalizedCategory,
    normalizedSubCategory,
  );
  const cacheKey = `${categoryCacheKey}:${page}:${limit}`;

  if (!normalizedCategory) {
    return {
      models: [],
      pagination: { page, limit, total: 0, hasMore: false },
    };
  }

  if (!force && categoryModelPageCache.has(cacheKey)) {
    return categoryModelPageCache.get(cacheKey);
  }

  if (!force && categoryModelPagePromiseCache.has(cacheKey)) {
    return categoryModelPagePromiseCache.get(cacheKey);
  }

  const promise = requestCloudModelsBackend(
    "/design2D3D/assets",
    {
      params: {
        category: normalizedCategory,
        ...(normalizedSubCategory ? { sub_category: normalizedSubCategory } : {}),
        page,
        limit,
      },
    },
    {
      requestType: "category-models-page",
      category: normalizedCategory,
      subCategory: normalizedSubCategory,
      page,
      limit,
    },
  )
    .then((response) => {
      const payload = getResponseItems(response?.data);
      const normalizedModels = payload.map((model) => normalizeCloudModel(model));
      const models = normalizedModels.filter(
        (model) =>
          model.category === normalizedCategory &&
          (!normalizedSubCategory || model.subCategory === normalizedSubCategory) &&
          model.modelUrl,
      );
      const result = {
        models,
        pagination: getResponsePagination(response?.data, models.length),
      };

      categoryModelPageCache.set(cacheKey, result);
      categoryModelsCache.set(categoryCacheKey, [
        ...(categoryModelsCache.get(categoryCacheKey) || []).filter(
          (model) => !models.some((nextModel) => nextModel.id === model.id),
        ),
        ...models,
      ]);

      return result;
    })
    .finally(() => {
      categoryModelPagePromiseCache.delete(cacheKey);
    });

  categoryModelPagePromiseCache.set(cacheKey, promise);
  return promise;
}

export async function fetchCloudModelsByCategory(category, options = {}) {
  const normalizedCategory = normalizeCloudModelCategory(category);
  const normalizedSubCategory = normalizeCloudModelSubcategory(
    options.subCategory || options.sub_category,
  );
  const categoryCacheKey = getCloudModelCategoryCacheKey(
    normalizedCategory,
    normalizedSubCategory,
  );
  const { force = false } = options;
  logCloudModelTrace("category:called", {
    requestedCategory: category || null,
    normalizedCategory,
    normalizedSubCategory,
    force,
  });

  if (!normalizedCategory) {
    logCloudModelTrace("category:empty-category");
    return [];
  }

  if (!force && categoryModelsCache.has(categoryCacheKey)) {
    logCloudModelTrace("category:cache-hit", {
      category: normalizedCategory,
      subCategory: normalizedSubCategory,
      count: categoryModelsCache.get(categoryCacheKey)?.length || 0,
    });
    return categoryModelsCache.get(categoryCacheKey);
  }

  if (!force && categoryModelsPromiseCache.has(categoryCacheKey)) {
    logCloudModelTrace("category:promise-hit", {
      category: normalizedCategory,
      subCategory: normalizedSubCategory,
    });
    return categoryModelsPromiseCache.get(categoryCacheKey);
  }

  logCloudModelTrace("category:cache-miss", {
    category: normalizedCategory,
    subCategory: normalizedSubCategory,
    force,
  });
  const promise = requestCloudModelsBackend(
    "/design2D3D/assets",
    {
      params: {
        category: normalizedCategory,
        ...(normalizedSubCategory ? { sub_category: normalizedSubCategory } : {}),
      },
    },
    {
      requestType: "category-models",
      category: normalizedCategory,
      subCategory: normalizedSubCategory,
    },
  )
    .then((response) => {
      const payload = getResponseItems(response?.data);
      const normalizedModels = payload.map((model) => normalizeCloudModel(model));
      const models = normalizedModels.filter(
        (model) =>
          model.category === normalizedCategory &&
          (!normalizedSubCategory || model.subCategory === normalizedSubCategory) &&
          model.modelUrl,
      );
      const rejectedModels = normalizedModels.filter(
        (model) =>
          model.category !== normalizedCategory ||
          (normalizedSubCategory && model.subCategory !== normalizedSubCategory) ||
          !model.modelUrl,
      );

      logCloudModelTrace("category:response", {
        category: normalizedCategory,
        subCategory: normalizedSubCategory,
        status: response?.status || null,
        payloadCount: payload.length,
        normalizedCount: normalizedModels.length,
        acceptedCount: models.length,
        rejectedCount: rejectedModels.length,
        firstAccepted: models[0]
          ? {
              id: models[0].id,
              name: models[0].name,
              category: models[0].category,
              hasModelUrl: Boolean(models[0].modelUrl),
              hasThumbnailUrl: Boolean(models[0].thumbnailUrl),
              hasTopViewUrl: Boolean(models[0].topViewUrl),
            }
          : null,
        firstRejected: rejectedModels[0]
          ? {
              id: rejectedModels[0].id,
              name: rejectedModels[0].name,
              category: rejectedModels[0].category,
              hasModelUrl: Boolean(rejectedModels[0].modelUrl),
              hasTopViewUrl: Boolean(rejectedModels[0].topViewUrl),
            }
          : null,
      });

      return models;
    })
    .catch(async (error) => {
      if (error?.response?.status === 404) {
        logCloudModelTrace("category:not-found", {
          category: normalizedCategory,
          subCategory: normalizedSubCategory,
        });
        return [];
      }

      logCloudModelTrace("category:error", {
        category: normalizedCategory,
        subCategory: normalizedSubCategory,
        status: error?.response?.status || null,
        message: error?.message || "Unknown error",
        backendMessage: error?.response?.data?.message || null,
      });

      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch cloud model metadata.";
      throw new Error(backendMessage);
    })
    .then((models) => {
      categoryModelsCache.set(categoryCacheKey, models);
      if (!Array.isArray(cloudModelCategoriesCache)) {
        cloudModelCategoriesCache = [];
      }
      if (!cloudModelCategoriesCache.includes(normalizedCategory)) {
        cloudModelCategoriesCache = [
          ...cloudModelCategoriesCache,
          normalizedCategory,
        ].sort();
      }
      if (!normalizedSubCategory && Array.isArray(allCloudModelsCache)) {
        const otherModels = allCloudModelsCache.filter(
          (model) => model.category !== normalizedCategory,
        );
        allCloudModelsCache = [...otherModels, ...models];
      }
      categoryModelsPromiseCache.delete(categoryCacheKey);
      return models;
    })
    .catch((error) => {
      categoryModelsPromiseCache.delete(categoryCacheKey);
      throw error;
    });

  categoryModelsPromiseCache.set(categoryCacheKey, promise);
  return promise;
}
