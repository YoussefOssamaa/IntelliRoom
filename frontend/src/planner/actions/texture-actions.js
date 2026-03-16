import {
  SELECT_TEXTURE,
  APPLY_TEXTURE_TO_ELEMENT,
  CANCEL_TEXTURE_APPLICATION
} from '../constants';

/**
 * Select a texture to apply. Enters texture application mode.
 * @param {string} textureKey - The texture key (e.g., 'bricks', 'parquet')
 * @param {string} targetType - 'wall' or 'floor'
 */
export function selectTexture(textureKey, targetType) {
  return {
    type: SELECT_TEXTURE,
    textureKey,
    targetType
  };
}

/**
 * Apply the selected texture to a specific element.
 * @param {string} layerID - The layer containing the element
 * @param {string} elementID - The element ID
 * @param {string} elementPrototype - 'lines' or 'areas'
 * @param {string} propertyName - 'textureA', 'textureB', or 'texture'
 * @param {string} textureKey - The texture key to apply
 */
export function applyTextureToElement(layerID, elementID, elementPrototype, propertyName, textureKey) {
  return {
    type: APPLY_TEXTURE_TO_ELEMENT,
    layerID,
    elementID,
    elementPrototype,
    propertyName,
    textureKey
  };
}

/**
 * Cancel texture application mode and return to 3D view.
 */
export function cancelTextureApplication() {
  return {
    type: CANCEL_TEXTURE_APPLICATION
  };
}
