import * as Three from 'three';

// Cache for ghost materials to avoid creating new ones repeatedly
const ghostMaterialCache = new Map();

/**
 * Create or get a cached ghost material
 * @param {Three.Material} originalMaterial - The original material
 * @param {number} opacity - Opacity level
 * @param {number} color - Tint color
 * @returns {Three.Material} - Ghost material
 */
function getGhostMaterial(originalMaterial, opacity, color) {
  const cacheKey = `${originalMaterial.uuid}_${opacity}_${color}`;
  
  if (ghostMaterialCache.has(cacheKey)) {
    return ghostMaterialCache.get(cacheKey).clone();
  }
  
  const ghostMat = originalMaterial.clone();
  ghostMat.transparent = true;
  ghostMat.opacity = opacity;
  ghostMat.depthWrite = false;
  ghostMat.color = new Three.Color(color);
  // Render ghost on top for visibility
  ghostMat.depthTest = true;
  
  ghostMaterialCache.set(cacheKey, ghostMat);
  return ghostMat.clone();
}

/**
 * Clear the ghost material cache (call periodically to free memory)
 */
export function clearGhostMaterialCache() {
  ghostMaterialCache.forEach(mat => mat.dispose());
  ghostMaterialCache.clear();
}

/**
 * Create a ghost (semi-transparent preview) version of a 3D mesh
 * @param {Three.Object3D} originalMesh - The original 3D mesh
 * @param {number} opacity - Opacity level (0-1)
 * @param {number} color - Optional tint color
 * @returns {Three.Object3D} - Ghost mesh
 */
export function createGhostMesh(originalMesh, opacity = 0.5, color = 0x4db8ff) {
  if (!originalMesh) {
    console.error('createGhostMesh: originalMesh is null or undefined');
    return new Three.Group();
  }
  
  let ghostMesh;
  
  // Try standard cloning first
  try {
    ghostMesh = originalMesh.clone();
  } catch (error) {
    console.warn('Standard clone failed, using fallback:', error);
    ghostMesh = cloneMeshFallback(originalMesh);
  }
  
  // Apply ghost material to all mesh children
  ghostMesh.traverse((child) => {
    if (child.isMesh && child.material) {
      try {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => getGhostMaterial(mat, opacity, color));
        } else {
          child.material = getGhostMaterial(child.material, opacity, color);
        }
      } catch (e) {
        // Fallback: create a simple ghost material
        child.material = new Three.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          depthWrite: false
        });
      }
    }
  });

  ghostMesh.userData.isGhost = true;
  ghostMesh.renderOrder = 999; // Render on top
  return ghostMesh;
}

/**
 * Fallback method to clone mesh when standard clone fails
 */
function cloneMeshFallback(originalMesh) {
  const ghostMesh = new Three.Group();
  ghostMesh.position.copy(originalMesh.position);
  ghostMesh.rotation.copy(originalMesh.rotation);
  ghostMesh.scale.copy(originalMesh.scale);
  
  if (originalMesh.children && Array.isArray(originalMesh.children)) {
    originalMesh.children.forEach(child => {
      if (child && child.clone) {
        try {
          ghostMesh.add(child.clone());
        } catch (e) {
          console.warn('Failed to clone child:', e);
        }
      }
    });
  }
  
  return ghostMesh;
}

/**
 * Dispose a ghost mesh and clean up resources
 * @param {Three.Object3D} ghostMesh - Ghost mesh to dispose
 */
export function disposeGhostMesh(ghostMesh) {
  if (!ghostMesh) return;

  ghostMesh.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    }
  });

  if (ghostMesh.parent) {
    ghostMesh.parent.remove(ghostMesh);
  }
}

/**
 * Update ghost mesh position and rotation
 * @param {Three.Object3D} ghostMesh - Ghost mesh
 * @param {Three.Vector3} position - New position
 * @param {number} rotation - Rotation angle in radians
 */
export function updateGhostTransform(ghostMesh, position, rotation = 0) {
  if (!ghostMesh) return;

  ghostMesh.position.copy(position);
  ghostMesh.rotation.y = rotation;
}

/**
 * Check if mesh is valid for ghosting (has geometry and material)
 * @param {Three.Object3D} mesh - Mesh to check
 * @returns {boolean}
 */
export function isValidForGhosting(mesh) {
  if (!mesh) return false;

  let hasGeometry = false;
  mesh.traverse((child) => {
    if (child.isMesh && child.geometry && child.material) {
      hasGeometry = true;
    }
  });

  return hasGeometry;
}

/**
 * Create a placement indicator (circle on ground)
 * @param {number} radius - Circle radius
 * @param {number} color - Circle color
 * @returns {Three.Mesh} - Ground indicator mesh
 */
export function createPlacementIndicator(radius = 25, color = 0x4db8ff) {
  const geometry = new Three.RingGeometry(radius - 2, radius, 32);
  const material = new Three.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.6,
    side: Three.DoubleSide,
    depthWrite: false
  });

  const indicator = new Three.Mesh(geometry, material);
  indicator.rotation.x = -Math.PI / 2;
  indicator.userData.isIndicator = true;

  return indicator;
}
