import * as Three from 'three';

function disposeGeometry(geometry) {
  geometry.dispose();
}

function disposeTexture(texture) {
  if (!texture) {
    return;
  }
  texture.dispose();
}

function disposeMultimaterial(material) {
  // Modern Three.js uses array of materials instead of MultiMaterial
  if (!Array.isArray(material)) {
    return;
  }
  material.forEach(mat => {
    disposeMaterial(mat);
  });

}

function disposeMaterial(material) {
  if (!(material instanceof Three.Material)) {
    return;
  }

  disposeTexture(material.map);
  material.map = null;
  material.dispose();
}

function disposeMesh(mesh) {
  if (!(mesh instanceof Three.Mesh || mesh instanceof Three.BoxHelper || mesh instanceof Three.LineSegments)) {
    return;
  }
  disposeGeometry(mesh.geometry);
  disposeMultimaterial(mesh.material);
  disposeMaterial(mesh.material);

  mesh.geometry = null;
  mesh.material = null;
}

export function disposeScene(scene3D) {
  scene3D.traverse(child => {
    disposeMesh(child);
    child = null;
  });
}

export function disposeObject(object) {
  object.traverse(child => {
    disposeMesh(child);
    child = null;
  });
}
