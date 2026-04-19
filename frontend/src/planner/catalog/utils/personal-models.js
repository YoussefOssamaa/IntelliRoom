import * as Three from "three";
import GLBItemFactory from "./glb-item-factory.jsx";
import { loadGLB } from "./load-gltf";

const DEFAULT_DIMENSION_CM = 100;

const sanitizeToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "model";

const humanizeFileName = (fileName) =>
  String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || "Custom Model";

const toDimension = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return { length: DEFAULT_DIMENSION_CM, unit: "cm" };
  }

  return {
    length: Math.max(1, Math.round(numericValue * 10) / 10),
    unit: "cm",
  };
};

async function inferModelDimensions(modelUrl) {
  const scene = await loadGLB(modelUrl, null, { isBinary: true });
  const box = new Three.Box3().setFromObject(scene);
  if (box.isEmpty()) {
    return {
      width: toDimension(DEFAULT_DIMENSION_CM),
      depth: toDimension(DEFAULT_DIMENSION_CM),
      height: toDimension(DEFAULT_DIMENSION_CM),
    };
  }

  const size = box.getSize(new Three.Vector3());
  return {
    width: toDimension(size.x),
    depth: toDimension(size.z),
    height: toDimension(size.y),
  };
}

export async function createPersonalModelDefinition(file, modelUrl) {
  const displayName = humanizeFileName(file?.name);
  const dimensions = await inferModelDimensions(modelUrl);
  const type = `personal-upload-${sanitizeToken(file?.name)}-${Date.now().toString(36)}`;

  const element = GLBItemFactory({
    name: type,
    info: {
      title: displayName,
      tag: ["personal", "uploaded"],
      description: `Uploaded by user from ${file?.name || "local file"}`,
      image: null,
    },
    modelFile: modelUrl,
    size: dimensions,
    materialAdjustments: {
      emissiveIntensity: 0.03,
      enableShadows: true,
    },
  });

  return {
    id: type,
    type,
    name: displayName,
    fileName: file?.name || displayName,
    image: null,
    prototype: "items",
    category: "personal",
    dimensions,
    modelUrl,
    element,
  };
}
