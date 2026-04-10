/*jshint esversion: 6 */
import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

/**
 * Modern CSG wrapper using three-bvh-csg library
 * Maintains backward compatibility with old ThreeBSP API
 */
export default class ThreeBSP {
    constructor(geometry) {
        this.mesh = null;
        this.matrix = new THREE.Matrix4();

        if (geometry instanceof THREE.BufferGeometry) {
            // Modern BufferGeometry
            this.mesh = new THREE.Mesh(geometry);
        } else if (geometry instanceof THREE.Mesh) {
            // Mesh input - apply its transform to the geometry so CSG operations are correct
            geometry.updateMatrix();
            this.matrix = geometry.matrix.clone();
            
            // Clone the mesh and bake the transform into the geometry
            this.mesh = geometry.clone();
            this.mesh.geometry = geometry.geometry.clone();
            this.mesh.geometry.applyMatrix4(geometry.matrix);
            
            // Reset mesh transform since it's now baked into geometry
            this.mesh.position.set(0, 0, 0);
            this.mesh.rotation.set(0, 0, 0);
            this.mesh.scale.set(1, 1, 1);
            this.mesh.updateMatrix();
        } else {
            throw 'ThreeBSP: Given geometry is unsupported (must be BufferGeometry or Mesh)';
        }
    }

    subtract(other_tree) {
        const evaluator = new Evaluator();
        const brushA = new Brush(this.mesh.geometry.clone());
        const brushB = new Brush(other_tree.mesh.geometry.clone());
        
        const result = evaluator.evaluate(brushA, brushB, SUBTRACTION);
        
        const resultBSP = new ThreeBSP(result);
        resultBSP.matrix = this.matrix.clone();
        return resultBSP;
    }

    union(other_tree) {
        const evaluator = new Evaluator();
        const brushA = new Brush(this.mesh.geometry.clone());
        const brushB = new Brush(other_tree.mesh.geometry.clone());
        
        const result = evaluator.evaluate(brushA, brushB, ADDITION);
        
        const resultBSP = new ThreeBSP(result);
        resultBSP.matrix = this.matrix.clone();
        return resultBSP;
    }

    intersect(other_tree) {
        const evaluator = new Evaluator();
        const brushA = new Brush(this.mesh.geometry.clone());
        const brushB = new Brush(other_tree.mesh.geometry.clone());
        
        const result = evaluator.evaluate(brushA, brushB, INTERSECTION);
        
        const resultBSP = new ThreeBSP(result);
        resultBSP.matrix = this.matrix.clone();
        return resultBSP;
    }

    toGeometry() {
        // Return BufferGeometry (modern Three.js)
        return this.mesh.geometry;
    }

    toMesh(material) {
        const geometry = this.mesh.geometry.clone();
        // Attempt to preserve existing UVs; if absent, create a simple planar set.
        ensureUVs(geometry);
        
        // If material is an array (multi-material), use the first one since CSG destroys material groups
        const finalMaterial = Array.isArray(material) ? material[0] : material;
        const mesh = new THREE.Mesh(geometry, finalMaterial);
        
        // Don't apply stored matrix - the caller handles positioning
        // mesh.position.setFromMatrixPosition(this.matrix);
        // mesh.rotation.setFromRotationMatrix(this.matrix);
        return mesh;
    }
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.ThreeBSP = ThreeBSP;
}

/**
 * Ensure geometry has a 'uv' attribute. If missing, generate a basic planar projection
 * using the bounding box extents in X and Y. This is generic; specific factories (e.g. walls)
 * can overwrite UVs later with more accurate mapping.
 */
function ensureUVs(geometry) {
    if (geometry.attributes.uv) return; // Already present
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const rangeX = (bb.max.x - bb.min.x) || 1;
    const rangeY = (bb.max.y - bb.min.y) || 1;
    const pos = geometry.attributes.position;
    const uvArray = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uvArray[i * 2] = (x - bb.min.x) / rangeX;
        uvArray[i * 2 + 1] = (y - bb.min.y) / rangeY;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
}
