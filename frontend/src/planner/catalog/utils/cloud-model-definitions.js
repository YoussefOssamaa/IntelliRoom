import GLBItemFactory from "./glb-item-factory.jsx";
import { schedulePlannerModelAssetPreload } from "./model-asset-cache";

const metersToCentimeters = (value, fallbackMeters = 1) => {
  const numericValue = Number(value);
  const metersValue =
    Number.isFinite(numericValue) && numericValue > 0
      ? numericValue
      : fallbackMeters;

  return {
    length: Math.round(metersValue * 1000) / 10,
    unit: "cm",
  };
};

export function createCloudModelCatalogElement(model) {
  const dimensions = model?.metadata?.dimensions || {};

  return GLBItemFactory({
    name: model.type,
    info: {
      title: model.name,
      tag: [model.category, "cloud-model", "furniture"],
      description: `Cloud-hosted model from ${model.category.replace(/_/g, " ")}`,
      image: model.thumbnailUrl,
      topViewUrl: model.topViewUrl,
    },
    modelFile: model.modelUrl,
    size: {
      width: metersToCentimeters(dimensions.width),
      depth: metersToCentimeters(dimensions.depth),
      height: metersToCentimeters(dimensions.height),
    },
    materialAdjustments: {
      emissiveIntensity: 0,
      enableShadows: true,
    },
  });
}

export function ensureCloudModelRegistered(catalog, model) {
  if (!catalog.hasElement(model.type)) {
    catalog.registerElement(createCloudModelCatalogElement(model));
    return { ...model, didRegister: true };
  }

  return { ...model, didRegister: false };
}

export function warmCloudModelSelection(model) {
  schedulePlannerModelAssetPreload(model);
}

export function ensureCloudModelsRegistered(catalog, models = []) {
  const registeredModels = [];
  let didRegisterAny = false;

  models.forEach((model) => {
    if (!model?.type) return;

    const registeredModel = ensureCloudModelRegistered(catalog, model);
    if (registeredModel.didRegister) {
      didRegisterAny = true;
    }
    registeredModels.push(registeredModel);
  });

  return { models: registeredModels, didRegisterAny };
}
