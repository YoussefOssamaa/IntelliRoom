import * as Three from 'three';

/**
 * Generate a top-down view icon from a 3D mesh
 * @param {Three.Object3D} mesh3D - The 3D mesh to generate icon from
 * @param {number} width - Icon width in pixels
 * @param {number} height - Icon height in pixels
 * @returns {string} - Data URL of the generated icon
 */
export function generateTopViewIcon(mesh3D, width = 64, height = 64) {
  // Create a temporary renderer
  const renderer = new Three.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    preserveDrawingBuffer: true 
  });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0); // Transparent background

  // Create scene
  const scene = new Three.Scene();

  // Clone the mesh to avoid modifying original
  const meshClone = mesh3D.clone();
  scene.add(meshClone);

  // Calculate bounding box
  const box = new Three.Box3().setFromObject(meshClone);
  const center = box.getCenter(new Three.Vector3());
  const size = box.getSize(new Three.Vector3());

  // Position camera for top-down view
  const camera = new Three.OrthographicCamera(
    -size.x / 2, size.x / 2,
    size.z / 2, -size.z / 2,
    0.1, 1000
  );
  
  camera.position.set(center.x, center.y + size.y + 10, center.z);
  camera.lookAt(center);

  // Add lighting
  const ambientLight = new Three.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new Three.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(0, 10, 0);
  scene.add(directionalLight);

  // Render
  renderer.render(scene, camera);

  // Get data URL
  const dataURL = renderer.domElement.toDataURL('image/png');

  // Cleanup
  renderer.dispose();
  scene.remove(meshClone);

  return dataURL;
}

/**
 * Create a simple SVG icon based on item dimensions
 * @param {number} width - Item width
 * @param {number} depth - Item depth  
 * @param {string} color - Fill color
 * @returns {string} - SVG string
 */
export function generateSimpleSVGIcon(width, depth, color = '#666666') {
  const scale = 40; // Scale factor for visibility
  const w = width * scale;
  const d = depth * scale;
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${d}" viewBox="0 0 ${w} ${d}">
      <rect x="1" y="1" width="${w-2}" height="${d-2}" 
            fill="${color}" stroke="#333333" stroke-width="2" 
            rx="2" opacity="0.8"/>
      <circle cx="${w/2}" cy="${d/2}" r="3" fill="#ffffff" opacity="0.6"/>
    </svg>
  `;
}

/**
 * Get or generate 2D icon for an item
 * @param {object} itemElement - Item catalog element
 * @param {object} layer - Current layer
 * @returns {string} - Image data URL or SVG string
 */
export function getItem2DIcon(itemElement, layer) {
  // Check if item has custom 2D icon defined
  if (itemElement.render2DIcon) {
    return itemElement.render2DIcon(itemElement, layer);
  }

  // Check if item has 3D render function
  if (itemElement.render3D) {
    try {
      const mesh3D = itemElement.render3D(itemElement, layer);
      return generateTopViewIcon(mesh3D);
    } catch (error) {
      console.warn('Failed to generate 3D icon for', itemElement.name, error);
    }
  }

  // Fallback: generate simple SVG based on item properties
  const width = itemElement.properties?.width?.defaultValue?.length || 50;
  const depth = itemElement.properties?.depth?.defaultValue?.length || 50;
  
  return 'data:image/svg+xml;base64,' + btoa(generateSimpleSVGIcon(width, depth));
}
