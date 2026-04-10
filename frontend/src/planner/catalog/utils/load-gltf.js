import { GLTFLoader } from 'three-stdlib';
import * as Three from 'three';

/**
 * Load a GLTF/GLB file and return the 3D scene
 * @param {string} gltfFile - Path to .gltf or .glb file
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise} Promise that resolves with the loaded 3D object
 */
export function loadGLTF(gltfFile, onProgress) {
  const loader = new GLTFLoader();
  
  // Check if this is a GLB file (binary, self-contained) or GLTF (needs external resources)
  const isGLB = gltfFile.toLowerCase().endsWith('.glb') || 
                gltfFile.includes('.glb?') || // Webpack hash
                gltfFile.match(/\.glb[^a-zA-Z]/); // GLB with any suffix
  
  // Extract the directory path from the file to help load external textures
  // Only set base path for GLTF files with relative paths (not GLB or absolute URLs)
  const isAbsoluteUrl = gltfFile.startsWith('http://') || gltfFile.startsWith('https://');
  const lastSlash = gltfFile.lastIndexOf('/');
  
  // Only set path for GLTF files that need external resources
  if (!isGLB && !isAbsoluteUrl && lastSlash !== -1) {
    const basePath = gltfFile.substring(0, lastSlash + 1);
    loader.setPath(basePath);
  }
  
  return new Promise((resolve, reject) => {
    loader.load(
      gltfFile,
      (gltf) => {
        const scene = gltf.scene;
        
        // Ensure proper color space and material settings for all meshes
        scene.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach((material) => {
              // Ensure textures use correct color space
              if (material.map) {
                material.map.colorSpace = Three.SRGBColorSpace;
                material.map.needsUpdate = true;
              }
              if (material.emissiveMap) {
                material.emissiveMap.colorSpace = Three.SRGBColorSpace;
                material.emissiveMap.needsUpdate = true;
              }
              if (material.aoMap) {
                material.aoMap.colorSpace = Three.LinearSRGBColorSpace;
              }
              
              // Ensure material responds to scene lighting
              material.needsUpdate = true;
            });
            
            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        resolve(scene);
      },
      onProgress,
      (error) => {
        console.error('Error loading GLTF/GLB:', error);
        reject(error);
      }
    );
  });
}

/**
 * Deep clone a 3D object with all materials and textures properly cloned.
 * This prevents texture/material sharing issues between instances.
 * @param {Three.Object3D} object - The object to clone
 * @returns {Three.Object3D} - A deep cloned copy with independent materials
 */
export function deepCloneWithMaterials(object) {
  const cloned = object.clone();
  
  // Clone materials for each mesh to prevent sharing
  cloned.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(mat => mat.clone());
      } else {
        child.material = child.material.clone();
      }
    }
  });
  
  return cloned;
}

/**
 * Load a GLB file (binary GLTF)
 * @param {string} glbFile - Path to .glb file
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise} Promise that resolves with the loaded 3D object
 */
export function loadGLB(glbFile, onProgress) {
  return loadGLTF(glbFile, onProgress);
}
