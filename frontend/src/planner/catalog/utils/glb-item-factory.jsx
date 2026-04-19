import * as Three from "three";
import React from "react";
import convert from "convert-units";
import {
  loadGLTF,
  deepCloneWithMaterials,
  normalizeMaterialForPlanner,
} from "./load-gltf";

const templateCache = new Map();
const templatePromiseCache = new Map();

function computeTemplateBounds(object) {
  const box = new Three.Box3().setFromObject(object);
  const size = box.getSize(new Three.Vector3());

  const bounds = {
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    size: { x: size.x, y: size.y, z: size.z },
  };

  object.userData.__plannerTemplateBounds = bounds;
  return bounds;
}

function getTemplateBounds(object) {
  return (
    object?.userData?.__plannerTemplateBounds || computeTemplateBounds(object)
  );
}

function prepareTemplateObject(object, materialAdjustments) {
  const { emissiveIntensity = 0, enableShadows = true } =
    materialAdjustments || {};

  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      normalizeMaterialForPlanner(material);

      if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
        material.needsUpdate = true;
        if (emissiveIntensity > 0 && !material.map) {
          if (
            material.color &&
            (!material.emissive || material.emissive.r === 0)
          ) {
            material.emissive = material.color.clone();
            material.emissive.multiplyScalar(0.1);
            material.emissiveIntensity = emissiveIntensity;
          }
        }
      } else if (
        (material.isMeshLambertMaterial || material.isMeshPhongMaterial) &&
        emissiveIntensity > 0 &&
        !material.map &&
        material.color
      ) {
        if (!material.emissive || material.emissive.r === 0) {
          material.emissive = material.color.clone();
          material.emissive.multiplyScalar(emissiveIntensity * 0.2);
        }
      }
    });

    child.castShadow = !!enableShadows;
    child.receiveShadow = !!enableShadows;
  });

  computeTemplateBounds(object);
  return object;
}

function getPreparedTemplate(cacheKey, modelFile, materialAdjustments) {
  if (templateCache.has(cacheKey)) {
    return Promise.resolve(templateCache.get(cacheKey));
  }

  if (templatePromiseCache.has(cacheKey)) {
    return templatePromiseCache.get(cacheKey);
  }

  const promise = loadGLTF(modelFile)
    .then((sourceObject) => {
      const templateObject = deepCloneWithMaterials(sourceObject);
      prepareTemplateObject(templateObject, materialAdjustments);
      templateCache.set(cacheKey, templateObject);
      templatePromiseCache.delete(cacheKey);
      return templateObject;
    })
    .catch((error) => {
      templatePromiseCache.delete(cacheKey);
      throw error;
    });

  templatePromiseCache.set(cacheKey, promise);
  return promise;
}

export function preloadGLBItemModel(
  cacheKey,
  modelFile,
  materialAdjustments = {},
) {
  return getPreparedTemplate(cacheKey, modelFile, materialAdjustments);
}

export default function GLBItemFactory(config) {
  const {
    name,
    info,
    modelFile,
    size,
    properties: customProperties = {},
    render2DCustom,
    style2D = {},
    materialAdjustments = {},
  } = config;

  const { emissiveIntensity = 0, enableShadows = true } = materialAdjustments;
  const defaultWidth = size?.width || { length: 50, unit: "cm" };
  const defaultDepth = size?.depth || { length: 50, unit: "cm" };
  const defaultHeight = size?.height || { length: 50, unit: "cm" };
  const cacheKey = name;

  return {
    name,
    prototype: "items",

    info: {
      title: info.title || name,
      tag: info.tag || ["furniture"],
      description: info.description || "",
      image: info.image,
    },

    properties: {
      altitude: {
        label: "Altitude",
        type: "length-measure",
        defaultValue: { length: 0 },
      },
      width: {
        label: "Width",
        type: "length-measure",
        defaultValue: defaultWidth,
      },
      depth: {
        label: "Depth",
        type: "length-measure",
        defaultValue: defaultDepth,
      },
      height: {
        label: "Height",
        type: "length-measure",
        defaultValue: defaultHeight,
      },
      ...customProperties,
    },

    render2D(element, layer, scene) {
      if (render2DCustom) {
        return render2DCustom(element, layer, scene);
      }

      const width = element.properties.get("width").get("length");
      const depth = element.properties.get("depth").get("length");
      const angle = element.rotation + 90;
      const textRotation = Math.sin((angle * Math.PI) / 180) < 0 ? 180 : 0;

      const defaultStyle = {
        stroke: element.selected ? "#0096fd" : "#000",
        strokeWidth: "2px",
        fill: style2D.fill || "#84e1ce",
      };

      const arrowStyle = {
        stroke: element.selected ? "#0096fd" : null,
        strokeWidth: "2px",
        fill: style2D.fill || "#84e1ce",
      };

      return (
        <g transform={`translate(${-width / 2},${-depth / 2})`}>
          <rect
            key="1"
            x="0"
            y="0"
            width={width}
            height={depth}
            style={defaultStyle}
          />
          <line
            x1={width / 2}
            x2={width / 2}
            y1={depth}
            y2={1.5 * depth}
            style={arrowStyle}
          />
          <line
            x1={0.35 * width}
            x2={width / 2}
            y1={1.2 * depth}
            y2={1.5 * depth}
            style={arrowStyle}
          />
          <line
            x1={width / 2}
            x2={0.65 * width}
            y1={1.5 * depth}
            y2={1.2 * depth}
            style={arrowStyle}
          />
          <text
            key="2"
            x="0"
            y="0"
            transform={`translate(${width / 2}, ${depth / 2}) scale(1,-1) rotate(${textRotation})`}
            style={{ textAnchor: "middle", fontSize: "11px" }}
          >
            {element.type}
          </text>
        </g>
      );
    },

    render3D(element, layer, scene) {
      const width = element.properties.get("width");
      const depth = element.properties.get("depth");
      const height = element.properties.get("height");
      const altitude = element.properties.get("altitude").get("length");

      const newWidth = convert(width.get("length"))
        .from(width.get("unit"))
        .to(scene.unit);
      const newHeight = convert(height.get("length"))
        .from(height.get("unit"))
        .to(scene.unit);
      const newDepth = convert(depth.get("length"))
        .from(depth.get("unit"))
        .to(scene.unit);

      const cloneAndScaleTemplate = (templateObject) => {
        const object = deepCloneWithMaterials(templateObject);
        const templateBounds = getTemplateBounds(templateObject);
        const originalWidth = templateBounds.size.x;
        const originalHeight = templateBounds.size.y;
        const originalDepth = templateBounds.size.z;

        const scaleX = originalWidth > 0 ? newWidth / originalWidth : 1;
        const scaleY = originalHeight > 0 ? newHeight / originalHeight : 1;
        const scaleZ = originalDepth > 0 ? newDepth / originalDepth : 1;

        object.scale.set(scaleX, scaleY, scaleZ);
        object.position.x -=
          (templateBounds.min.x + originalWidth / 2) * scaleX;
        object.position.y -= templateBounds.min.y * scaleY;
        object.position.z -=
          (templateBounds.min.z + originalDepth / 2) * scaleZ;
        object.position.y += altitude;

        return object;
      };

      return getPreparedTemplate(cacheKey, modelFile, {
        emissiveIntensity,
        enableShadows,
      }).then(cloneAndScaleTemplate);
    },

    updateRender3D(
      element,
      layer,
      scene,
      mesh,
      oldElement,
      differences,
      selfDestroy,
      selfBuild,
    ) {
      const rebuild = () => {
        selfDestroy();
        return selfBuild();
      };

      if (differences.indexOf("selected") !== -1) {
        return Promise.resolve(mesh);
      }

      if (differences.indexOf("rotation") !== -1) {
        mesh.rotation.y = (element.rotation * Math.PI) / 180;
        return Promise.resolve(mesh);
      }

      if (differences.indexOf("x") !== -1 || differences.indexOf("y") !== -1) {
        return Promise.resolve(mesh);
      }

      return rebuild();
    },
  };
}

export function createSimpleGLBItem(
  name,
  title,
  description,
  tags,
  glbFile,
  pngFile,
  size,
  materialAdjustments,
) {
  return GLBItemFactory({
    name,
    info: {
      title,
      tag: tags,
      description,
      image: pngFile,
    },
    modelFile: glbFile,
    size,
    materialAdjustments,
  });
}

export function createComplexGLTFItem(
  name,
  title,
  description,
  tags,
  gltfFile,
  previewImage,
  size,
  additionalConfig = {},
) {
  return GLBItemFactory({
    name,
    info: {
      title,
      tag: tags,
      description,
      image: previewImage,
    },
    modelFile: gltfFile,
    size,
    ...additionalConfig,
  });
}
