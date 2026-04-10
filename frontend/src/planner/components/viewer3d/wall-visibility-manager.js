'use strict';

import * as Three from 'three';

/**
 * WallVisibilityManager - Dynamically controls wall visibility based on camera position
 * 
 * Features:
 * - Hides walls that are between the camera and the interior of rooms
 * - Uses wall normal direction to determine if wall faces camera
 * - Smooth opacity transitions for professional appearance
 * - Configurable settings for different behaviors
 */
export class WallVisibilityManager {
  constructor(options = {}) {
    // Configuration options
    this.enabled = options.enabled !== false;
    this.fadeSpeed = options.fadeSpeed || 0.1; // Opacity change per frame
    this.minOpacity = options.minOpacity || 0.0; // Fully invisible when hidden
    this.maxOpacity = options.maxOpacity || 1.0; // Fully visible when shown
    this.distanceThreshold = options.distanceThreshold || 2000; // Distance to start hiding walls
    this.angleThreshold = options.angleThreshold || Math.PI / 3; // ~60 degrees
    
    // Track walls and their target/current opacities
    this.wallStates = new Map(); // wallID -> { mesh, targetOpacity, currentOpacity, normal, center, holeIDs }
    
    // Track holes keyed by holeID → { currentOpacity }
    this.holeOpacities = new Map();
    
    // Expose the set of currently-hidden wall meshes so the selection / hover
    // gizmo manager can skip them during raycasting.
    this.hiddenWallMeshes = new Set();
    // Expose the set of hidden hole IDs so hover/selection skips hidden holes too.
    this.hiddenHoleIDs = new Set();
    
    // Track area meshes for ceiling/floor visibility
    this.areaStates = new Map(); // areaID -> { mesh, ceilingOpacity, floorOpacity }
    
    // Reference to scene elements
    this.planData = null;
    this.camera = null;
    
    // View settings visibility state
    this.viewSettings = {
      walls: true,
      furniture: true,
      grid: true,
      helpers: true,
      markers: true,
      guides: true,
      doors: true,
      windows: true,
      ceiling: true,
    };
  }
  
  /**
   * Initialize with scene data and camera
   */
  init(planData, camera) {
    this.planData = planData;
    this.camera = camera;
  }
  
  /**
   * Register a wall mesh with its metadata
   * Called when walls are added to the scene
   * @param {boolean} inverted - true if the vertices were swapped (vertex0.x > vertex1.x) in scene-creator
   */
  registerWall(wallID, mesh, lineData, vertices, inverted = false) {
    if (!mesh) return;
    
    // Calculate wall center position in world space
    const v0 = vertices.get(0);
    const v1 = vertices.get(1);
    
    const centerX = (v0.x + v1.x) / 2;
    const centerY = (v0.y + v1.y) / 2;
    const center = new Three.Vector3(centerX, 0, -centerY);
    
    // Calculate wall normal (perpendicular to wall direction)
    const dx = v1.x - v0.x;
    const dy = v1.y - v0.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const sideAInside = lineData.properties ? lineData.properties.get('sideAInside') : undefined;
    const leftIsInside = (sideAInside === undefined)
      ? true
      : (sideAInside === true) !== inverted;

    const normalin  = leftIsInside
      ? new Three.Vector3(-dy / length, 0, -dx / length)
      : new Three.Vector3( dy / length, 0,  dx / length);
    const nomalout  = leftIsInside
      ? new Three.Vector3( dy / length, 0,  dx / length)
      : new Three.Vector3(-dy / length, 0, -dx / length);
    
    // Determine if this wall is part of a complete area
    // (sideAInside is only set by detectAndUpdateAreas for area-boundary walls)
    const isPartOfArea = sideAInside !== undefined;
    
    // Collect hole IDs belonging to this wall
    const holeIDs = [];
    if (lineData.holes) {
      const holesCol = lineData.holes;
      if (typeof holesCol.forEach === 'function') {
        holesCol.forEach(hID => holeIDs.push(hID));
      }
    }
    
    // Store wall state
    this.wallStates.set(wallID, {
      mesh,
      targetOpacity: 1.0,
      currentOpacity: 1.0,
      normalin,
      nomalout,
      center,
      lineData,
      holeIDs,
      isPartOfArea,
      originalMaterials: this.cloneMaterials(mesh)
    });
    
    // Ensure materials support transparency
    this.prepareMaterialsForTransparency(mesh);
  }
  
  /**
   * Unregister a wall when it's removed from the scene
   */
  unregisterWall(wallID) {
    const state = this.wallStates.get(wallID);
    if (state && state.originalMaterials) {
      // Restore original materials before removal
      this.restoreMaterials(state.mesh, state.originalMaterials);
    }
    this.wallStates.delete(wallID);
  }
  
  /**
   * Clone materials for later restoration
   */
  cloneMaterials(mesh) {
    const materials = [];
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          materials.push({
            mesh: child,
            materials: child.material.map(m => ({ 
              transparent: m.transparent, 
              opacity: m.opacity,
              depthWrite: m.depthWrite
            }))
          });
        } else {
          materials.push({
            mesh: child,
            materials: [{ 
              transparent: child.material.transparent, 
              opacity: child.material.opacity,
              depthWrite: child.material.depthWrite
            }]
          });
        }
      }
    });
    return materials;
  }
  
  /**
   * Restore original material properties
   */
  restoreMaterials(mesh, originalMaterials) {
    originalMaterials.forEach(entry => {
      if (entry.mesh && entry.mesh.material) {
        if (Array.isArray(entry.mesh.material)) {
          entry.mesh.material.forEach((m, i) => {
            if (entry.materials[i]) {
              m.transparent = entry.materials[i].transparent;
              m.opacity = entry.materials[i].opacity;
              m.depthWrite = entry.materials[i].depthWrite;
            }
          });
        } else if (entry.materials[0]) {
          entry.mesh.material.transparent = entry.materials[0].transparent;
          entry.mesh.material.opacity = entry.materials[0].opacity;
          entry.mesh.material.depthWrite = entry.materials[0].depthWrite;
        }
      }
    });
  }
  
  /**
   * Prepare mesh materials for transparency effects
   */
  prepareMaterialsForTransparency(mesh) {
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          mat.transparent = true;
          // Keep depthWrite true for opaque walls, toggle during fade
        });
      }
    });
  }
  
  /**
   * Register an area mesh so ceiling/floor can be hidden dynamically.
   */
  registerArea(areaID, mesh) {
    if (!mesh) return;
    this.prepareMaterialsForTransparency(mesh);
    this.areaStates.set(areaID, {
      mesh,
      ceilingOpacity: 1.0,
      floorOpacity: 1.0
    });
  }

  /**
   * Unregister an area mesh when it is removed from the scene.
   */
  unregisterArea(areaID) {
    this.areaStates.delete(areaID);
  }

  /**
   * Update wall visibility based on camera position
   * Call this every frame in the render loop
   */
  update() {
    if (!this.enabled || !this.camera || !this.planData) return;
    
    // Skip until the camera has been positioned by onBoundingBoxReady.
    if (this.camera.position.length() < 1) return;
    
    const cameraPosition = this.camera.position.clone();

    // --- Camera look-direction for ceiling / floor logic ---
    const camDir = new Three.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    // camDir.y < 0  →  looking down  →  hide ceiling
    // camDir.y > 0  →  looking up    →  hide floor
    const lookDownFactor = -camDir.y; // positive when looking down
    
    // ---------- Walls (+ associated holes) ----------
    this.hiddenWallMeshes.clear();
    this.hiddenHoleIDs.clear();
    
    this.wallStates.forEach((state, wallID) => {
      const shouldHide = this.shouldHideWall(state, cameraPosition);

      state.targetOpacity = shouldHide ? this.minOpacity : this.maxOpacity;
      
      if (Math.abs(state.currentOpacity - state.targetOpacity) > 0.01) {
        if (state.currentOpacity < state.targetOpacity) {
          state.currentOpacity = Math.min(state.currentOpacity + this.fadeSpeed, state.targetOpacity);
        } else {
          state.currentOpacity = Math.max(state.currentOpacity - this.fadeSpeed, state.targetOpacity);
        }
        
        this.setMeshOpacity(state.mesh, state.currentOpacity);
      }
      
      // Track hidden walls so raycasting / hover can skip them
      if (state.currentOpacity < 0.5) {
        this.hiddenWallMeshes.add(state.mesh);
        // Mark every hole belonging to this wall as hidden too
        if (state.holeIDs) state.holeIDs.forEach(hID => this.hiddenHoleIDs.add(hID));
      }
      
      // Apply the same opacity to every hole that belongs to this wall
      if (state.holeIDs && state.holeIDs.length > 0 && this.planData.sceneGraph) {
        const layers = this.planData.sceneGraph.layers;
        for (const layerID in layers) {
          const layerHoles = layers[layerID].holes;
          if (!layerHoles) continue;
          for (const hID of state.holeIDs) {
            const holeMesh = layerHoles[hID];
            if (holeMesh) {
              // Force full sync: set visibility + opacity to match parent wall
              this.setMeshOpacity(holeMesh, state.currentOpacity);
              this.holeOpacities.set(hID, state.currentOpacity);
            }
          }
        }
      }
    });

    // ---------- Ceiling / Floor ----------
    // Hide ceiling when camera looks down, hide floor when camera looks up.
    // Use a threshold so it's not too aggressive.
    const ceilTarget = lookDownFactor > 0.25 ? this.minOpacity : this.maxOpacity;
    const floorTarget = lookDownFactor < -0.25 ? this.minOpacity : this.maxOpacity;

    this.areaStates.forEach((aState) => {
      const mesh = aState.mesh;
      if (!mesh) return;

      // Ceiling child
      const ceiling = mesh.getObjectByName('ceiling');
      if (ceiling) {
        if (Math.abs(aState.ceilingOpacity - ceilTarget) > 0.01) {
          if (aState.ceilingOpacity < ceilTarget) {
            aState.ceilingOpacity = Math.min(aState.ceilingOpacity + this.fadeSpeed, ceilTarget);
          } else {
            aState.ceilingOpacity = Math.max(aState.ceilingOpacity - this.fadeSpeed, ceilTarget);
          }
          this.setMeshOpacity(ceiling, aState.ceilingOpacity);
        }
      }

      // Floor child
      const floor = mesh.getObjectByName('floor');
      if (floor) {
        if (Math.abs(aState.floorOpacity - floorTarget) > 0.01) {
          if (aState.floorOpacity < floorTarget) {
            aState.floorOpacity = Math.min(aState.floorOpacity + this.fadeSpeed, floorTarget);
          } else {
            aState.floorOpacity = Math.max(aState.floorOpacity - this.fadeSpeed, floorTarget);
          }
          this.setMeshOpacity(floor, aState.floorOpacity);
        }
      }
    });
  }
  
  /**
   * Determine if a wall should be hidden
   */
  shouldHideWall(state, cameraPosition) {
    if (!this.viewSettings.walls) {
      return true; // Hide all walls if walls are toggled off
    }
    
    // Never hide standalone walls that aren't part of a complete area
    if (!state.isPartOfArea) {
      return false;
    }
    
    const { center, normalin } = state;
    
    // Vector from camera to wall center
    const toWall = center.clone().sub(cameraPosition);
    const distanceToWall = toWall.length();
    toWall.normalize();
    
    // Never hide walls that are very far away
    if (distanceToWall > this.distanceThreshold * 3) {
      return false;
    }
    
    // Check if camera is on the exterior side of this wall.
    // normalin points INTO the room (interior normal).
    // If dotFront > 0 the interior normal aligns with the camera→wall vector,
    // which means the camera is on the EXTERIOR side — hide the wall so you
    // can see inside.
    const dotFront = normalin.dot(toWall);
    const isOnExteriorSide = dotFront > 0;
    
    // Check if wall is close enough to bother hiding
    const isClose = distanceToWall < this.distanceThreshold;
    
    // Hide wall only when camera is on exterior side AND close enough.
    // We intentionally omit the "view cone" angle check — it was too
    // restrictive when the camera is high above (most walls end up > 60°
    // from the straight-down view direction).
    return isClose && isOnExteriorSide;
  }
  
  /**
   * Set opacity for all materials in a mesh
   */
  setMeshOpacity(mesh, opacity) {
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          mat.opacity = opacity;
          // Disable depth write when transparent to prevent z-fighting
          mat.depthWrite = opacity > 0.9;
          mat.needsUpdate = true;
        });
      }
      
      // Also handle LineSegments for edge lines
      if (child.isLineSegments && child.material) {
        child.material.opacity = opacity;
        child.material.transparent = true;
        child.material.needsUpdate = true;
      }
    });
    
    // Update visibility flag for fully hidden walls
    mesh.visible = opacity > 0.01;
  }
  
  /**
   * Toggle visibility for a category of elements
   */
  setViewSetting(category, visible) {
    if (this.viewSettings.hasOwnProperty(category)) {
      this.viewSettings[category] = visible;
      
      // Apply immediate changes for non-wall categories
      if (category !== 'walls') {
        this.applyViewSettings();
      }
    }
  }
  
  /**
   * Get current view settings
   */
  getViewSettings() {
    return { ...this.viewSettings };
  }
  
  /**
   * Apply view settings to scene elements
   */
  applyViewSettings() {
    if (!this.planData) return;
    
    // Handle grid visibility
    if (this.planData.grid) {
      this.planData.grid.visible = this.viewSettings.grid;
    }
    
    // Handle items (furniture) visibility
    const layers = this.planData.sceneGraph?.layers;
    if (layers) {
      Object.values(layers).forEach(layer => {
        // Toggle furniture/items
        if (layer.items) {
          Object.values(layer.items).forEach(item => {
            if (item) item.visible = this.viewSettings.furniture;
          });
        }
        
        // Toggle walls (via opacity system, not direct visibility)
        // Walls are handled in the update() loop
      });
    }
  }
  
  /**
   * Force all walls to be visible (for resetting)
   */
  showAllWalls() {
    this.wallStates.forEach((state) => {
      state.targetOpacity = this.maxOpacity;
      state.currentOpacity = this.maxOpacity;
      this.setMeshOpacity(state.mesh, this.maxOpacity);
      // Also restore all holes belonging to this wall
      if (state.holeIDs && state.holeIDs.length > 0 && this.planData && this.planData.sceneGraph) {
        const layers = this.planData.sceneGraph.layers;
        for (const layerID in layers) {
          const layerHoles = layers[layerID].holes;
          if (!layerHoles) continue;
          for (const hID of state.holeIDs) {
            const holeMesh = layerHoles[hID];
            if (holeMesh) {
              this.setMeshOpacity(holeMesh, this.maxOpacity);
              this.holeOpacities.set(hID, this.maxOpacity);
            }
          }
        }
      }
    });
    this.hiddenWallMeshes.clear();
    this.hiddenHoleIDs.clear();
    
    // Also restore ceiling visibility
    this.areaStates.forEach((aState) => {
      const mesh = aState.mesh;
      if (!mesh) return;
      const ceiling = mesh.getObjectByName('ceiling');
      if (ceiling) {
        aState.ceilingOpacity = this.maxOpacity;
        this.setMeshOpacity(ceiling, this.maxOpacity);
      }
    });
  }
  
  /**
   * Enable/disable the visibility manager
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.showAllWalls();
    }
  }
  
  /**
   * Clean up when destroying
   */
  dispose() {
    this.wallStates.forEach((state) => {
      if (state.originalMaterials) {
        this.restoreMaterials(state.mesh, state.originalMaterials);
      }
    });
    this.wallStates.clear();
    this.holeOpacities.clear();
    this.areaStates.clear();
    this.planData = null;
    this.camera = null;
  }
}

// Singleton instance for easy access
export const wallVisibilityManager = new WallVisibilityManager();
