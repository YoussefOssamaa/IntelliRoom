import * as Three from 'three';
import React from 'react';
import { loadGLTF, deepCloneWithMaterials, normalizeMaterialForPlanner } from './load-gltf';

// Cache for loaded 3D models to avoid reloading
const holeModelCache = new Map();

/**
 * GLB Hole Factory - Creates planner hole elements (doors/windows) from GLB/GLTF files
 * 
 * Holes are elements that snap to walls and create openings (doors, windows, etc.)
 * 
 * @param {Object} config - Configuration object for the hole
 * @param {string} config.name - Unique identifier for the hole (e.g., 'outer-metal-window')
 * @param {Object} config.info - Hole metadata
 * @param {string} config.info.title - Display title (e.g., 'Metal Window')
 * @param {string[]} config.info.tag - Tags for categorization (e.g., ['window', 'metal'])
 * @param {string} config.info.description - Hole description
 * @param {string} config.info.image - Imported asset URL for the preview image
 * @param {string} config.modelFile - Imported asset URL for the GLB/GLTF file
 * @param {Object} config.size - Default dimensions
 * @param {Object} config.size.width - Width with length and unit (e.g., { length: 100, unit: 'cm' })
 * @param {Object} config.size.height - Height with length and unit
 * @param {Object} config.size.thickness - Thickness with length and unit
 * @param {Object} [config.size.altitude] - Default altitude above floor
 * @param {boolean} [config.hasFlip=true] - Whether the hole can be flipped
 * @param {string} [config.holeType='window'] - Type of hole: 'window' or 'door'
 * @param {Object} [config.properties] - Additional custom properties
 * @param {Object} [config.materialAdjustments] - Optional material lighting adjustments
 * @returns {Object} Planner hole element configuration
 */
export default function GLBHoleFactory(config) {
  const {
    name,
    info,
    modelFile,
    size,
    hasFlip = true,
    holeType = 'window',
    properties: customProperties = {},
    materialAdjustments = {}
  } = config;

  // Material adjustment defaults
  const {
    emissiveIntensity = 0,
    enableShadows = true
  } = materialAdjustments;

  // Default dimensions
  const defaultWidth = size?.width || { length: 100, unit: 'cm' };
  const defaultHeight = size?.height || { length: 100, unit: 'cm' };
  const defaultThickness = size?.thickness || { length: 20, unit: 'cm' };
  // Altitude is relative to slab top (0 = sitting on slab)
  // Windows typically 90cm above slab, doors at 0cm (on slab)
  const defaultAltitude = size?.altitude || { length: holeType === 'window' ? 90 : 0, unit: 'cm' };

  // Generate a unique cache key for this model
  const cacheKey = name;

  // Build properties object
  const baseProperties = {
    width: {
      label: 'Width',
      type: 'length-measure',
      defaultValue: defaultWidth
    },
    height: {
      label: 'Height',
      type: 'length-measure',
      defaultValue: defaultHeight
    },
    thickness: {
      label: 'Thickness',
      type: 'length-measure',
      defaultValue: defaultThickness
    },
    altitude: {
      label: 'Altitude',
      type: 'length-measure',
      // Altitude is measured from slab top (0 = on slab surface)
      defaultValue: defaultAltitude
    }
  };

  // Add flip property if enabled
  if (hasFlip) {
    baseProperties.flip_horizontal = {
      label: 'Flip',
      type: 'checkbox',
      defaultValue: false,
      values: {
        'none': false,
        'yes': true
      }
    };
  }

  return {
    name,
    prototype: 'holes',

    info: {
      title: info.title || name,
      tag: info.tag || [holeType],
      description: info.description || '',
      image: info.image
    },

    properties: {
      ...baseProperties,
      ...customProperties
    },

    render2D: function (element, layer, scene) {
      const epsilon = 3;
      const holeWidth = element.properties.get('width').get('length');
      const flip = hasFlip ? element.properties.get('flip_horizontal') : false;
      
      // Styles
      const STYLE_HOLE_BASE = { stroke: '#000', strokeWidth: '3px', fill: '#000' };
      const STYLE_HOLE_SELECTED = { stroke: '#0096fd', strokeWidth: '3px', fill: '#0096fd', cursor: 'move' };
      const holeStyle = element.selected ? STYLE_HOLE_SELECTED : STYLE_HOLE_BASE;

      if (holeType === 'door') {
        // Door 2D representation with swing arc
        const STYLE_ARC_BASE = { stroke: '#000', strokeWidth: '2px', strokeDasharray: '5,5', fill: 'none' };
        const STYLE_ARC_SELECTED = { stroke: '#0096fd', strokeWidth: '2px', strokeDasharray: '5,5', fill: 'none', cursor: 'move' };
        const arcStyle = element.selected ? STYLE_ARC_SELECTED : STYLE_ARC_BASE;
        
        const holePath = `M${0} ${-epsilon} L${holeWidth} ${-epsilon} L${holeWidth} ${epsilon} L${0} ${epsilon} z`;
        const arcPath = `M${0},${0} A${holeWidth},${holeWidth} 0 0,1 ${holeWidth},${holeWidth}`;
        
        if (flip) {
          return (
            <g transform={`translate(${-holeWidth / 2}, 0)`}>
              <path key="1" d={arcPath} style={arcStyle} transform={`translate(${holeWidth},${-holeWidth}) rotate(90)`} />
              <line key="2" x1={holeWidth} y1={0 - epsilon} x2={holeWidth} y2={-holeWidth - epsilon} style={holeStyle} />
              <path key="3" d={holePath} style={holeStyle} />
            </g>
          );
        } else {
          return (
            <g transform={`translate(${-holeWidth / 2}, 0)`}>
              <path key="1" d={arcPath} style={arcStyle} transform={`translate(${0},${holeWidth}) rotate(270)`} />
              <line key="2" x1={0} y1={0 + epsilon} x2={0} y2={holeWidth + epsilon} style={holeStyle} />
              <path key="3" d={holePath} style={holeStyle} />
            </g>
          );
        }
      } else {
        // Window 2D representation - simple rectangle with center line
        const holePath = `M${0} ${-epsilon} L${holeWidth} ${-epsilon} L${holeWidth} ${epsilon} L${0} ${epsilon} z`;
        
        return (
          <g transform={`translate(${-holeWidth / 2}, 0)`}>
            <path key="1" d={holePath} style={holeStyle} />
            <line key="2" x1={holeWidth / 2} y1={-10 - epsilon} x2={holeWidth / 2} y2={10 + epsilon} style={holeStyle} />
          </g>
        );
      }
    },

    render3D: function (element, layer, scene) {
      const width = element.properties.get('width').get('length');
      const height = element.properties.get('height').get('length');
      const thickness = element.properties.get('thickness').get('length');
      const altitude = element.properties.get('altitude').get('length');
      const flip = hasFlip ? element.properties.get('flip_horizontal') : false;

      const onLoadItem = (object) => {
        // Fix material lighting issues - traverse and adjust materials
        object.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach((material) => {
              normalizeMaterialForPlanner(material);

              const materialName = `${material.name || ''} ${child.name || ''}`.toLowerCase();
              const looksLikeGlass = materialName.includes('glass') || materialName.includes('glazing');
              const isStandardLike = material.isMeshStandardMaterial || material.isMeshPhysicalMaterial;

              if (holeType === 'door' || holeType === 'window') {
                material.side = Three.DoubleSide;

                if (isStandardLike) {
                  if (!material.envMap && material.metalness > 0.2) {
                    material.metalness = 0.08;
                  }
                  material.roughness = Math.max(material.roughness ?? 0.08, holeType === 'window' ? 0.12 : 0.22);
                }
              }

              if (looksLikeGlass) {
                material.transparent = true;
                material.opacity = Math.min(typeof material.opacity === 'number' ? material.opacity : 1, holeType === 'window' ? 0.18 : 0.28);
                material.depthWrite = false;
                material.side = Three.DoubleSide;

                if (isStandardLike) {
                  material.metalness = 0;
                  material.roughness = Math.max(material.roughness ?? 0.08, 0.08);
                }

                if (material.isMeshPhysicalMaterial) {
                  material.transmission = Math.max(material.transmission || 0, 0.9);
                  material.thickness = Math.max(material.thickness || 0, 0.02);
                }
              }

              if (emissiveIntensity > 0 && !material.map && material.color) {
                if (!material.emissive || material.emissive.r === 0) {
                  material.emissive = material.color.clone();
                  material.emissive.multiplyScalar(0.1);
                  material.emissiveIntensity = emissiveIntensity;
                }
              }

              material.needsUpdate = true;

              if (enableShadows) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
          }
        });

        // Selection boxes are managed by viewer3d.updateSelectionBoxes() at scene\n        // level so they track the element correctly (no double-transform).\n\n        // Get the bounding box to normalize the object
        const boundingBox = new Three.Box3().setFromObject(object);
        
        const originalWidth = boundingBox.max.x - boundingBox.min.x;
        const originalHeight = boundingBox.max.y - boundingBox.min.y;
        const originalDepth = boundingBox.max.z - boundingBox.min.z;

        // Avoid division by zero
        const scaleX = originalWidth > 0 ? width / originalWidth : 1;
        const scaleY = originalHeight > 0 ? height / originalHeight : 1;
        const scaleZ = originalDepth > 0 ? thickness / originalDepth : 1;

        // Scale to desired dimensions
        object.scale.set(scaleX, scaleY, scaleZ);

        // IMPORTANT: scene-creator.js addHole() handles positioning and rotation
        // We only need to ensure the model is properly centered at origin
        // The addHole function will:
        // 1. Position the hole along the wall using offset
        // 2. Set altitude based on properties
        // 3. Rotate to match wall angle
        
        // Center the object at origin (so addHole can position it correctly)
        const center = [
          (boundingBox.max.x + boundingBox.min.x) / 2,
          boundingBox.min.y, // Bottom of the model at y=0
          (boundingBox.max.z + boundingBox.min.z) / 2
        ];

        object.position.x = -center[0] * scaleX;
        object.position.y = -center[1] * scaleY; // Keep bottom at y=0
        object.position.z = -center[2] * scaleZ;

        // Apply flip if needed (rotation will be handled by addHole)
        if (flip) {
          object.rotation.y = Math.PI;
        }

        return object;
      };

      // Load from cache if available
      if (holeModelCache.has(cacheKey)) {
        const cachedModel = holeModelCache.get(cacheKey);
        return Promise.resolve(onLoadItem(deepCloneWithMaterials(cachedModel)));
      }

      // Load the GLB/GLTF file
      return loadGLTF(modelFile)
        .then(object => {
          holeModelCache.set(cacheKey, object);
          return onLoadItem(deepCloneWithMaterials(object));
        });
    }
  };
}

/**
 * Helper function to create a simple GLB window
 * 
 * @param {string} name - Window name/identifier
 * @param {string} title - Display title
 * @param {string} description - Window description
 * @param {string[]} tags - Tags for categorization
 * @param {string} glbFile - Imported GLB asset URL
 * @param {string} pngFile - Imported PNG asset URL (preview image)
 * @param {Object} size - Dimensions { width, height, thickness, altitude }
 * @param {Object} [materialAdjustments] - Optional material adjustments
 * @returns {Object} Planner hole element configuration
 */
export function createGLBWindow(name, title, description, tags, glbFile, pngFile, size, materialAdjustments) {
  return GLBHoleFactory({
    name,
    info: {
      title,
      tag: tags,
      description,
      image: pngFile
    },
    modelFile: glbFile,
    size,
    holeType: 'window',
    hasFlip: true,
    materialAdjustments
  });
}

/**
 * Helper function to create a simple GLB door
 * 
 * @param {string} name - Door name/identifier
 * @param {string} title - Display title
 * @param {string} description - Door description
 * @param {string[]} tags - Tags for categorization
 * @param {string} glbFile - Imported GLB asset URL
 * @param {string} pngFile - Imported PNG asset URL (preview image)
 * @param {Object} size - Dimensions { width, height, thickness, altitude }
 * @param {Object} [materialAdjustments] - Optional material adjustments
 * @returns {Object} Planner hole element configuration
 */
export function createGLBDoor(name, title, description, tags, glbFile, pngFile, size, materialAdjustments) {
  return GLBHoleFactory({
    name,
    info: {
      title,
      tag: tags,
      description,
      image: pngFile
    },
    modelFile: glbFile,
    size: {
      ...size,
      altitude: size?.altitude || { length: 0, unit: 'cm' }
    },
    holeType: 'door',
    hasFlip: true,
    materialAdjustments
  });
}
