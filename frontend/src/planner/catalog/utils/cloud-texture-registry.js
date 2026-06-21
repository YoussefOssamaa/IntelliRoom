export const DEFAULT_FLOOR_TEXTURE_ID = "interior_tiles";

export const DEFAULT_FLOOR_TEXTURE = {
  id: DEFAULT_FLOOR_TEXTURE_ID,
  textureKey: DEFAULT_FLOOR_TEXTURE_ID,
  name: "Interior Tiles",
  displayName: "Interior Tiles",
  category: "tiles",
  placement: "floor",
  maps: {
    Color:
      "https://res.cloudinary.com/dhjnbp168/image/upload/v1778613607/texture/interior_tiles/Color.png",
  },
  uri:
    "https://res.cloudinary.com/dhjnbp168/image/upload/v1778613607/texture/interior_tiles/Color.png",
  thumbnailUrl:
    "https://res.cloudinary.com/dhjnbp168/image/upload/v1778613607/texture/interior_tiles/Color.png",
  rendering: {
    lengthRepeatScale: 0.01,
    heightRepeatScale: 0.01,
    roughness: 1,
    metalness: 0,
  },
  prototype: "texture",
  isCloudTexture: true,
};

const cloudTextureRegistry = new Map([[DEFAULT_FLOOR_TEXTURE_ID, DEFAULT_FLOOR_TEXTURE]]);
let registeredCloudTextures = [DEFAULT_FLOOR_TEXTURE];

const TEXTURE_TARGETS = {
  wall: ["wall", "floor", "both"],
  floor: ["wall", "floor", "both"],
  both: ["wall", "floor", "both"],
};

const buildTextureValuesFromMap = (textureMap = {}) => {
  const values = { none: "None" };

  Object.entries(textureMap).forEach(([textureKey, texture]) => {
    if (!textureKey) return;
    values[textureKey] =
      texture?.displayName || texture?.name || textureKey;
  });

  return values;
};

const getStaticTextureMap = (textureMap = {}) =>
  Object.fromEntries(
    Object.entries(textureMap || {}).filter(
      ([, texture]) => !texture?.isCloudTexture,
    ),
  );

const toCloudTextureMap = (textures = []) =>
  Object.fromEntries(textures.map((texture) => [texture.id, texture]));

const dedupeTexturesBySourceId = (textures = []) => {
  const seenTextureIds = new Set();
  return textures.filter((texture) => {
    const textureId = String(texture?.id || "").trim().toLowerCase();
    if (!textureId || seenTextureIds.has(textureId)) return false;
    seenTextureIds.add(textureId);
    return true;
  });
};

const normalizeFallbackTextureDefinition = (
  textureKey,
  texture,
  targetType,
) => {
  if (!texture) return null;
  if (texture.maps?.Color || texture.uri) {
    return {
      ...texture,
      id: texture.id || textureKey,
      textureKey: texture.textureKey || textureKey,
      placement: texture.placement || targetType || "both",
      maps: {
        ...(texture.maps || {}),
        ...(texture.uri && !texture.maps?.Color ? { Color: texture.uri } : {}),
      },
      uri: texture.uri || texture.maps?.Color || "",
      rendering: texture.rendering || {
        lengthRepeatScale: texture.lengthRepeatScale,
        heightRepeatScale: texture.heightRepeatScale,
        normalScaleX: texture.normal?.normalScaleX,
        normalScaleY: texture.normal?.normalScaleY,
        roughness: texture.roughness,
        metalness: texture.metalness,
      },
    };
  }

  return null;
};

const updateCatalogElementTextureProperties = (
  element,
  propertyNames,
  values,
) => {
  if (!element?.properties) return false;

  let didUpdate = false;
  propertyNames.forEach((propertyName) => {
    const propertyConfig = element.properties[propertyName];
    if (!propertyConfig) return;

    const nextDefaultValue =
      propertyConfig.defaultValue && values[propertyConfig.defaultValue]
        ? propertyConfig.defaultValue
        : "none";

    element.properties[propertyName] = {
      ...propertyConfig,
      defaultValue: nextDefaultValue,
      values,
    };
    didUpdate = true;
  });

  return didUpdate;
};

export function registerCloudTextures(textures = []) {
  cloudTextureRegistry.clear();

  registeredCloudTextures = dedupeTexturesBySourceId([
    ...textures,
    DEFAULT_FLOOR_TEXTURE,
  ])
    .filter((texture) => texture?.id)
    .slice()
    .sort((leftTexture, rightTexture) =>
      String(leftTexture.displayName || leftTexture.name || leftTexture.id)
        .localeCompare(
          String(rightTexture.displayName || rightTexture.name || rightTexture.id),
        ),
    );

  registeredCloudTextures.forEach((texture) => {
    cloudTextureRegistry.set(texture.id, texture);
  });
  return registeredCloudTextures;
}

export function getRegisteredCloudTextures(targetType) {
  const placements = TEXTURE_TARGETS[targetType];

  if (!placements) {
    return registeredCloudTextures.slice();
  }

  return registeredCloudTextures.filter((texture) =>
    placements.includes(texture.placement),
  );
}

export function getRegisteredTextureById(textureKey) {
  return cloudTextureRegistry.get(String(textureKey || "").trim()) || null;
}

export function resolvePlannerTextureDefinition(
  textureKey,
  { targetType, fallbackTextures } = {},
) {
  const normalizedTextureKey = String(textureKey || "").trim();
  if (!normalizedTextureKey || normalizedTextureKey === "none") {
    return null;
  }

  const registeredTexture = getRegisteredTextureById(normalizedTextureKey);
  if (registeredTexture) {
    if (!targetType || targetType === "both") return registeredTexture;

    const allowedPlacements = TEXTURE_TARGETS[targetType];
    if (!allowedPlacements || allowedPlacements.includes(registeredTexture.placement)) {
      return registeredTexture;
    }

    return null;
  }

  const fallbackTexture = fallbackTextures?.[normalizedTextureKey];
  const fallbackDefinition = normalizeFallbackTextureDefinition(
    normalizedTextureKey,
    fallbackTexture,
    targetType,
  );

  if (fallbackDefinition) {
    return fallbackDefinition;
  }

  return null;
}

export function syncCloudTexturesIntoCatalog(catalog, textures = []) {
  if (!catalog?.hasElement?.("wall") || !catalog?.hasElement?.("area")) {
    registerCloudTextures(textures);
    return false;
  }

  registerCloudTextures(textures);

  const wallTextures = getRegisteredCloudTextures("wall");
  const floorTextures = getRegisteredCloudTextures("floor");

  const wallElement = catalog.getElement("wall");
  const areaElement = catalog.getElement("area");

  wallElement.textures = {
    ...getStaticTextureMap(wallElement.textures),
    ...toCloudTextureMap(wallTextures),
  };
  areaElement.textures = {
    ...getStaticTextureMap(areaElement.textures),
    ...toCloudTextureMap(floorTextures),
  };

  const didUpdateWall = updateCatalogElementTextureProperties(
    wallElement,
    ["textureA", "textureB"],
    buildTextureValuesFromMap(wallElement.textures),
  );
  const didUpdateArea = updateCatalogElementTextureProperties(
    areaElement,
    ["texture"],
    buildTextureValuesFromMap(areaElement.textures),
  );

  return didUpdateWall || didUpdateArea;
}
