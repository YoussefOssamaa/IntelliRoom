import * as Three from 'three';
import React from 'react';
import convert from 'convert-units';
import { loadGLTF, deepCloneWithMaterials } from './load-gltf';

// Cache for loaded 3D models to avoid reloading
const modelCache = new Map();

/**
 * GLB Item Factory - Creates planner elements from GLB/GLTF files
 * 
 * Supports two types of items:
 * 1. Simple: A single .glb file with a .png preview image
 * 2. Complex: A .gltf file with a .bin file and a textures folder
 * 
 * @param {Object} config - Configuration object for the item
 * @param {string} config.name - Unique identifier for the item (e.g., 'brown-royal-chair')
 * @param {Object} config.info - Item metadata
 * @param {string} config.info.title - Display title (e.g., 'Brown Royal Chair')
 * @param {string[]} config.info.tag - Tags for categorization (e.g., ['furniture', 'chair'])
 * @param {string} config.info.description - Item description
 * @param {string} config.info.image - Imported asset URL for the preview image
 * @param {string} config.modelFile - Imported asset URL for the GLB/GLTF file
 * @param {Object} config.size - Default dimensions
 * @param {Object} config.size.width - Width with length and unit (e.g., { length: 60, unit: 'cm' })
 * @param {Object} config.size.depth - Depth with length and unit
 * @param {Object} config.size.height - Height with length and unit
 * @param {Object} [config.properties] - Additional custom properties
 * @param {Function} [config.render2DCustom] - Optional custom 2D render function
 * @param {Object} [config.style2D] - Optional 2D render style overrides
 * @param {string} [config.style2D.fill] - Fill color for 2D representation
 * @param {string} [config.style2D.stroke] - Stroke color for 2D representation
 * @param {Object} [config.materialAdjustments] - Optional material lighting adjustments
 * @param {number} [config.materialAdjustments.emissiveIntensity=0.2] - Emissive intensity (0-1) to brighten dark models
 * @param {boolean} [config.materialAdjustments.enableShadows=true] - Enable shadow casting/receiving
 * @returns {Object} Planner element configuration
 */
export default function GLBItemFactory(config) {
  const {
    name,
    info,
    modelFile,
    size,
    properties: customProperties = {},
    render2DCustom,
    style2D = {},
    materialAdjustments = {}
  } = config;

  // Material adjustment defaults
  const {
    emissiveIntensity = 0,
    enableShadows = true
  } = materialAdjustments;

  // Default dimensions
  const defaultWidth = size?.width || { length: 50, unit: 'cm' };
  const defaultDepth = size?.depth || { length: 50, unit: 'cm' };
  const defaultHeight = size?.height || { length: 50, unit: 'cm' };

  // Generate a unique cache key for this model
  const cacheKey = name;

  return {
    name,
    prototype: 'items',

    info: {
      title: info.title || name,
      tag: info.tag || ['furniture'],
      description: info.description || '',
      image: info.image
    },

    properties: {
      altitude: {
        label: 'Altitude',
        type: 'length-measure',
        defaultValue: {
          length: 0
        }
      },
      width: {
        label: 'Width',
        type: 'length-measure',
        defaultValue: defaultWidth
      },
      depth: {
        label: 'Depth',
        type: 'length-measure',
        defaultValue: defaultDepth
      },
      height: {
        label: 'Height',
        type: 'length-measure',
        defaultValue: defaultHeight
      },
      ...customProperties
    },

    render2D: function (element, layer, scene) {
      // If custom render function is provided, use it
      if (render2DCustom) {
        return render2DCustom(element, layer, scene);
      }

      // Default 2D rendering
      const width = element.properties.get('width').get('length');
      const depth = element.properties.get('depth').get('length');

      const angle = element.rotation + 90;
      const textRotation = Math.sin(angle * Math.PI / 180) < 0 ? 180 : 0;

      const defaultStyle = {
        stroke: element.selected ? '#0096fd' : '#000',
        strokeWidth: '2px',
        fill: style2D.fill || '#84e1ce'
      };

      const arrowStyle = {
        stroke: element.selected ? '#0096fd' : null,
        strokeWidth: '2px',
        fill: style2D.fill || '#84e1ce'
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
          {/* Direction indicator arrow */}
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
            style={{ textAnchor: 'middle', fontSize: '11px' }}
          >
            {element.type}
          </text>
        </g>
      );
    },

    render3D: function (element, layer, scene) {
      const width = element.properties.get('width');
      const depth = element.properties.get('depth');
      const height = element.properties.get('height');
      const altitude = element.properties.get('altitude').get('length');

      const onLoadItem = (object) => {
        // Convert units to scene units
        const newWidth = convert(width.get('length')).from(width.get('unit')).to(scene.unit);
        const newHeight = convert(height.get('length')).from(height.get('unit')).to(scene.unit);
        const newDepth = convert(depth.get('length')).from(depth.get('unit')).to(scene.unit);

        // Fix material lighting issues - traverse and adjust materials
        object.traverse((child) => {
          if (child.isMesh && child.material) {
            // Handle both single materials and material arrays
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach((material) => {
              // Ensure all textures use the correct color space
              if (material.map) {
                material.map.colorSpace = Three.SRGBColorSpace;
                material.map.needsUpdate = true;
              }
              if (material.emissiveMap) {
                material.emissiveMap.colorSpace = Three.SRGBColorSpace;
                material.emissiveMap.needsUpdate = true;
              }
              // Keep normal, roughness, metalness maps in Linear space (they should stay as is)
              
              // Adjust material properties for better visibility
              if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                // For PBR materials, ensure they respond to light properly
                material.needsUpdate = true;
                
                // Only add subtle emissive if the material doesn't have textures
                // This prevents washing out textured models
                if (emissiveIntensity > 0 && !material.map) {
                  if (material.color && (!material.emissive || material.emissive.r === 0)) {
                    // Use a much darker emissive to avoid gray appearance
                    material.emissive = material.color.clone();
                    material.emissive.multiplyScalar(0.1); // Very subtle
                    material.emissiveIntensity = emissiveIntensity;
                  }
                }
              } else if (material.isMeshLambertMaterial || material.isMeshPhongMaterial) {
                // For legacy materials without textures, add subtle emissive
                if (emissiveIntensity > 0 && !material.map && material.color) {
                  if (!material.emissive || material.emissive.r === 0) {
                    material.emissive = material.color.clone();
                    material.emissive.multiplyScalar(emissiveIntensity * 0.2); // Much more subtle
                  }
                }
              }
              
              // Enable shadow casting/receiving (configurable)
              if (enableShadows) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
          }
        });

        // Selection boxes are managed by viewer3d.updateSelectionBoxes() at scene
        // level so they track the item correctly during drag (no double-transform).

        // Get the bounding box to normalize the object
        const boundingBox = new Three.Box3().setFromObject(object);
        
        const originalWidth = boundingBox.max.x - boundingBox.min.x;
        const originalHeight = boundingBox.max.y - boundingBox.min.y;
        const originalDepth = boundingBox.max.z - boundingBox.min.z;

        // Avoid division by zero
        const scaleX = originalWidth > 0 ? newWidth / originalWidth : 1;
        const scaleY = originalHeight > 0 ? newHeight / originalHeight : 1;
        const scaleZ = originalDepth > 0 ? newDepth / originalDepth : 1;

        // Scale to desired dimensions
        object.scale.set(scaleX, scaleY, scaleZ);

        // Center the object at origin
        const center = [
          (boundingBox.max.x - boundingBox.min.x) / 2 + boundingBox.min.x,
          (boundingBox.max.y - boundingBox.min.y) / 2 + boundingBox.min.y,
          (boundingBox.max.z - boundingBox.min.z) / 2 + boundingBox.min.z
        ];

        object.position.x -= center[0] * scaleX;
        object.position.y -= center[1] * scaleY - (boundingBox.max.y - boundingBox.min.y) * scaleY / 2;
        object.position.z -= center[2] * scaleZ;

        // Apply altitude
        object.position.y += altitude;

        return object;
      };

      // Load from cache if available - use deep clone to preserve materials/textures
      if (modelCache.has(cacheKey)) {
        const cachedModel = modelCache.get(cacheKey);
        return Promise.resolve(onLoadItem(deepCloneWithMaterials(cachedModel)));
      }

      // Load the GLB/GLTF file
      return loadGLTF(modelFile)
        .then(object => {
          modelCache.set(cacheKey, object);
          return onLoadItem(deepCloneWithMaterials(object));
        });
    },

    updateRender3D: (element, layer, scene, mesh, oldElement, differences, selfDestroy, selfBuild) => {
      const noPerf = () => { 
        selfDestroy(); 
        return selfBuild(); 
      };

      // Handle selection change — no-op since viewer manages bounding boxes
      if (differences.indexOf('selected') !== -1) {
        return Promise.resolve(mesh);
      }

      // Handle rotation change
      if (differences.indexOf('rotation') !== -1) {
        mesh.rotation.y = element.rotation * Math.PI / 180;
        return Promise.resolve(mesh);
      }

      // Handle position change — fast path (scene-creator also handles this,
      // but this prevents a full rebuild if updateRender3D is called)
      if (differences.indexOf('x') !== -1 || differences.indexOf('y') !== -1) {
        return Promise.resolve(mesh);
      }

      // For other changes, rebuild
      return noPerf();
    }
  };
}

/**
 * Helper function to create a simple GLB item configuration
 * Use this for items with just a .glb file and .png preview
 * 
 * @param {string} name - Item name/identifier
 * @param {string} title - Display title
 * @param {string} description - Item description
 * @param {string[]} tags - Tags for categorization
 * @param {string} glbFile - Imported GLB asset URL
 * @param {string} pngFile - Imported PNG asset URL (preview image)
 * @param {Object} size - Dimensions { width, depth, height } with { length, unit }
 * @param {Object} [materialAdjustments] - Optional material adjustments { emissiveIntensity, enableShadows }
 * @returns {Object} Planner element configuration
 */
export function createSimpleGLBItem(name, title, description, tags, glbFile, pngFile, size, materialAdjustments) {
  return GLBItemFactory({
    name,
    info: {
      title,
      tag: tags,
      description,
      image: pngFile
    },
    modelFile: glbFile,
    size,
    materialAdjustments
  });
}

/**
 * Helper function for items with GLTF + bin + textures
 * Note: For complex items using GLTF, import the .bin and texture files at the element
 * file top level so Vite bundles them — pass the imported asset URL as gltfFile.
 * 
 * @param {string} name - Item name/identifier
 * @param {string} title - Display title
 * @param {string} description - Item description
 * @param {string[]} tags - Tags for categorization
 * @param {string} gltfFile - Imported GLTF asset URL
 * @param {string} previewImage - Imported PNG asset URL (preview image)
 * @param {Object} size - Dimensions { width, depth, height } with { length, unit }
 * @param {Object} [additionalConfig] - Additional configuration options
 * @returns {Object} Planner element configuration
 */
export function createComplexGLTFItem(name, title, description, tags, gltfFile, previewImage, size, additionalConfig = {}) {
  return GLBItemFactory({
    name,
    info: {
      title,
      tag: tags,
      description,
      image: previewImage
    },
    modelFile: gltfFile,
    size,
    ...additionalConfig
  });
}
