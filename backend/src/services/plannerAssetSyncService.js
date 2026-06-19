import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PlannerTexture from "../models/design2D-3DModels/plannerTexture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const PLANNER_CATALOG_ROOT = path.join(
  PROJECT_ROOT,
  "frontend",
  "src",
  "planner",
  "catalog",
);

const parseBooleanEnv = (value) => String(value || "").trim().toLowerCase() === "true";

const readCatalogJson = async (fileName) => {
  const filePath = path.join(PLANNER_CATALOG_ROOT, fileName);
  const rawCatalog = await fs.readFile(filePath, "utf8");
  const parsedCatalog = JSON.parse(rawCatalog);

  if (!Array.isArray(parsedCatalog)) {
    throw new Error(`${fileName} must contain a JSON array`);
  }

  return parsedCatalog;
};

const normalizeTextureDocument = (texture) => ({
  id: String(texture.id || "").trim(),
  displayName: String(texture.displayName || "").trim(),
  category: String(texture.category || "other").trim().toLowerCase(),
  placement: String(texture.placement || "both").trim().toLowerCase(),
  source: String(texture.source || "").trim(),
  license: String(texture.license || "").trim(),
  resolution: String(texture.resolution || "").trim(),
  maps: {
    Color: String(texture.maps?.Color || "").trim(),
    NormalGL: String(texture.maps?.NormalGL || "").trim(),
    Roughness: String(texture.maps?.Roughness || "").trim(),
  },
});

const getTextureSyncKey = (texture) =>
  JSON.stringify({
    id: texture.id,
    displayName: texture.displayName,
    category: texture.category,
    placement: texture.placement,
    source: texture.source,
    license: texture.license,
    resolution: texture.resolution,
    maps: texture.maps || {},
  });

const dedupeByKey = (documents, getKey) => {
  const seenKeys = new Set();
  return documents.filter((document) => {
    const documentKey = getKey(document);
    if (!documentKey || seenKeys.has(documentKey)) return false;
    seenKeys.add(documentKey);
    return true;
  });
};

const forceRebuildCollection = async ({ model, documents, label }) => {
  const deleteResult = await model.deleteMany({});
  if (documents.length > 0) {
    await model.insertMany(documents, { ordered: false });
  }

  console.info(`[PlannerAssetSync] ${label} force sync complete`, {
    deletedDocuments: deleteResult.deletedCount || 0,
    insertedDocuments: documents.length,
  });
};

const syncTexturesFromCatalog = async () => {
  const shouldForce = parseBooleanEnv(process.env.PLANNER_textures_SYNC_FORCE);
  const shouldUpdate = parseBooleanEnv(process.env.PLANNER_textures_SYNC_UPDATE);
  if (!shouldForce && !shouldUpdate) return;

  const documents = dedupeByKey(
    (await readCatalogJson("textures.json"))
      .map(normalizeTextureDocument)
      .filter(
        (texture) =>
          texture.id &&
          texture.displayName &&
          texture.category &&
          texture.placement &&
          texture.maps.Color,
      ),
    getTextureSyncKey,
  );

  if (shouldForce) {
    await forceRebuildCollection({
      model: PlannerTexture,
      documents,
      label: "planner textures",
    });
    return;
  }

  const existingTextures = await PlannerTexture.find({})
    .select("id displayName category placement source license resolution maps")
    .lean();
  const existingKeys = new Set(existingTextures.map(getTextureSyncKey));
  const missingDocuments = documents.filter(
    (texture) => !existingKeys.has(getTextureSyncKey(texture)),
  );

  if (missingDocuments.length > 0) {
    await PlannerTexture.insertMany(missingDocuments, { ordered: false });
  }

  console.info("[PlannerAssetSync] planner textures update sync complete", {
    catalogDocuments: documents.length,
    existingDocuments: existingKeys.size,
    insertedDocuments: missingDocuments.length,
  });
};

export const syncPlannerAssetsFromCatalog = async () => {
  await PlannerTexture.init();
  await syncTexturesFromCatalog();
};
