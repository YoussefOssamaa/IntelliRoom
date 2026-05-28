import * as Three from 'three';
import convert from 'convert-units';
import { loadGLTF, deepCloneWithMaterials } from '../../catalog/utils/load-gltf';
import { disposeObject } from './three-memory-cleaner';

const DEFAULT_ITEM_DIMENSION = 50;
const DEFAULT_ITEM_HEIGHT = 90;
const DEFAULT_SLAB_HEIGHT = 20;
const MAX_MODEL_LOAD_RETRY_ATTEMPTS = 2;
const MODEL_LOAD_RETRY_DELAY_MS = 1500;

const getValue = (source, key, fallback = undefined) => {
  if (source && typeof source.get === 'function') {
    const value = source.get(key);
    return value === undefined ? fallback : value;
  }

  if (source && Object.prototype.hasOwnProperty.call(source, key)) {
    const value = source[key];
    return value === undefined ? fallback : value;
  }

  return fallback;
};

const getAsyncItemTracker = (planData) => {
  if (!planData.__asyncItemTracker) {
    planData.__asyncItemTracker = {
      versions: new Map(),
      loadRetryCounts: new Map(),
      loadRetryTimers: new Map(),
    };
  }

  return planData.__asyncItemTracker;
};

const getItemTrackerKey = (layerId, itemID) => `${layerId}:${itemID}`;

const bumpItemVersion = (planData, layerId, itemID) => {
  const tracker = getAsyncItemTracker(planData);
  const key = getItemTrackerKey(layerId, itemID);
  const nextVersion = (tracker.versions.get(key) || 0) + 1;
  tracker.versions.set(key, nextVersion);
  return nextVersion;
};

const isCurrentItemVersion = (planData, layerId, itemID, version) => {
  const tracker = getAsyncItemTracker(planData);
  return tracker.versions.get(getItemTrackerKey(layerId, itemID)) === version;
};

const getItemRetryCount = (planData, layerId, itemID) => {
  const tracker = getAsyncItemTracker(planData);
  return tracker.loadRetryCounts.get(getItemTrackerKey(layerId, itemID)) || 0;
};

const setItemRetryCount = (planData, layerId, itemID, retryCount) => {
  const tracker = getAsyncItemTracker(planData);
  tracker.loadRetryCounts.set(getItemTrackerKey(layerId, itemID), retryCount);
};

const clearItemRetryTimer = (planData, layerId, itemID) => {
  const tracker = getAsyncItemTracker(planData);
  const trackerKey = getItemTrackerKey(layerId, itemID);
  const pendingTimerId = tracker.loadRetryTimers.get(trackerKey);
  if (pendingTimerId) {
    clearTimeout(pendingTimerId);
    tracker.loadRetryTimers.delete(trackerKey);
  }
};

const resetItemRetryState = (planData, layerId, itemID) => {
  const tracker = getAsyncItemTracker(planData);
  tracker.loadRetryCounts.delete(getItemTrackerKey(layerId, itemID));
  clearItemRetryTimer(planData, layerId, itemID);
};

const scheduleItemLoadRetry = (
  planData,
  layerId,
  itemID,
  retryAttempt,
  retryCallback,
) => {
  const tracker = getAsyncItemTracker(planData);
  const trackerKey = getItemTrackerKey(layerId, itemID);
  clearItemRetryTimer(planData, layerId, itemID);

  const timerId = setTimeout(() => {
    tracker.loadRetryTimers.delete(trackerKey);
    retryCallback();
  }, MODEL_LOAD_RETRY_DELAY_MS * retryAttempt);

  tracker.loadRetryTimers.set(trackerKey, timerId);
};

const toSceneLength = (measure, sceneUnit, fallback) => {
  const length = Number(getValue(measure, 'length'));
  const unit = String(getValue(measure, 'unit', sceneUnit || 'cm') || sceneUnit || 'cm');

  if (!Number.isFinite(length) || length <= 0) {
    return fallback;
  }

  try {
    return convert(length).from(unit).to(sceneUnit || unit);
  } catch (_) {
    return length;
  }
};

const getItemDimensions = (item, sceneUnit) => {
  const properties = getValue(item, 'properties');

  return {
    width: toSceneLength(
      getValue(properties, 'width'),
      sceneUnit,
      DEFAULT_ITEM_DIMENSION,
    ),
    depth: toSceneLength(
      getValue(properties, 'depth'),
      sceneUnit,
      DEFAULT_ITEM_DIMENSION,
    ),
    height: toSceneLength(
      getValue(properties, 'height'),
      sceneUnit,
      DEFAULT_ITEM_HEIGHT,
    ),
    altitude: toSceneLength(getValue(properties, 'altitude'), sceneUnit, 0),
  };
};

const getLayerSlabHeight = (layer) => {
  let slabHeight = DEFAULT_SLAB_HEIGHT;

  try {
    layer.areas.forEach((area) => {
      if (!area || typeof area.get !== 'function') return;
      const floorThickness = area.getIn(['properties', 'floorThickness', 'length']);
      if (!floorThickness) return;
      slabHeight = floorThickness;
      return false;
    });
  } catch (_) {
    return slabHeight;
  }

  return slabHeight;
};

const resolveItemAsset = (item) => {
  const asset = getValue(item, 'asset');
  const modelUrl = String(
    getValue(item, 'modelUrl') || getValue(asset, 'modelUrl') || '',
  ).trim();
  const displayName = String(
    getValue(item, 'displayName') ||
      getValue(asset, 'name') ||
      getValue(item, 'name') ||
      getValue(item, 'type') ||
      'item',
  ).trim();

  return {
    modelUrl,
    displayName,
  };
};

const applyInteract = (object, interactFunction) => {
  object.traverse((child) => {
    if (child instanceof Three.Mesh || child instanceof Three.LineSegments) {
      child.interact = interactFunction;
    }
  });
};

const applyOpacity = (object, opacity) => {
  object.traverse((child) => {
    if (!child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      material.transparent = true;
      if (material.maxOpacity) {
        material.opacity = Math.min(material.maxOpacity, opacity);
      } else if (
        typeof material.opacity === 'number' &&
        material.opacity > opacity
      ) {
        material.maxOpacity = material.opacity;
        material.opacity = opacity;
      }
    });
  });
};

const getSelectItemInteract = (itemsActions, layerId, itemID) => {
  if (itemsActions && typeof itemsActions.selectItem === 'function') {
    return () => itemsActions.selectItem(layerId, itemID);
  }

  return () => null;
};

const createBoxIndicator = (dimensions, color, opacity) => {
  const group = new Three.Group();
  const geometry = new Three.BoxGeometry(
    dimensions.width,
    dimensions.height,
    dimensions.depth,
  );
  const surfaceMaterial = new Three.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  surfaceMaterial.maxOpacity = opacity;

  const mesh = new Three.Mesh(geometry, surfaceMaterial);
  mesh.position.y = dimensions.altitude + dimensions.height / 2;
  group.add(mesh);

  const edges = new Three.LineSegments(
    new Three.EdgesGeometry(geometry),
    new Three.LineBasicMaterial({ color, transparent: true, opacity: Math.min(opacity + 0.15, 1) }),
  );
  edges.position.copy(mesh.position);
  group.add(edges);

  return group;
};

const createPlaceholderObject = (item, sceneUnit) =>
  createBoxIndicator(getItemDimensions(item, sceneUnit), 0x5b8def, 0.22);

const createFallbackObject = (item, sceneUnit) =>
  createBoxIndicator(getItemDimensions(item, sceneUnit), 0xe76f51, 0.32);

const updatePivotItemBoundsMetadata = (pivot, item, sceneUnit) => {
  const dimensions = getItemDimensions(item, sceneUnit);
  pivot.userData.itemBounds = {
    halfWidth: dimensions.width / 2,
    halfDepth: dimensions.depth / 2,
    minY: dimensions.altitude,
    maxY: dimensions.altitude + dimensions.height,
  };
};

const prepareLoadedObject = (object) => {
  const boxHelpers = [];

  object.traverse((child) => {
    if (child instanceof Three.BoxHelper) {
      boxHelpers.push(child);
      return;
    }

    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = true;
    }
  });

  boxHelpers.forEach((helper) => {
    helper.parent?.remove(helper);
    helper.geometry?.dispose?.();
    helper.material?.dispose?.();
  });

  return object;
};

const buildLoadedItemObject = async (item, sceneData, modelUrl) => {
  const sourceObject = await loadGLTF(modelUrl, null, {
    isBinary: /\.glb($|[?#])/i.test(modelUrl),
  });
  const object = prepareLoadedObject(deepCloneWithMaterials(sourceObject));
  const dimensions = getItemDimensions(item, sceneData.unit);

  const box = new Three.Box3().setFromObject(object);
  const size = box.getSize(new Three.Vector3());

  const scaleX = size.x > 0 ? dimensions.width / size.x : 1;
  const scaleY = size.y > 0 ? dimensions.height / size.y : 1;
  const scaleZ = size.z > 0 ? dimensions.depth / size.z : 1;

  object.scale.set(scaleX, scaleY, scaleZ);
  object.position.x -= (box.min.x + size.x / 2) * scaleX;
  object.position.y -= box.min.y * scaleY;
  object.position.z -= (box.min.z + size.z / 2) * scaleZ;
  object.position.y += dimensions.altitude;

  return object;
};

const replacePivotContents = (pivot, nextObject) => {
  while (pivot.children.length > 0) {
    const child = pivot.children[0];
    pivot.remove(child);
    disposeObject(child);
  }

  pivot.add(nextObject);
};

export const updateStreamedItemTransform = (pivot, item, layer) => {
  if (!pivot) return;

  pivot.rotation.y = Number(getValue(item, 'rotation', 0) || 0) * Math.PI / 180;
  pivot.position.x = Number(getValue(item, 'x', 0) || 0);
  pivot.position.y = Number(layer.altitude || 0) + getLayerSlabHeight(layer);
  pivot.position.z = -Number(getValue(item, 'y', 0) || 0);
};

export function removeStreamedItem(planData, layerId, itemID, onItemChanged) {
  bumpItemVersion(planData, layerId, itemID);
  resetItemRetryState(planData, layerId, itemID);

  const layerGraph = planData.sceneGraph.layers[layerId];
  if (!layerGraph) return;

  const item3D = layerGraph.items[itemID];
  if (item3D) {
    planData.plan.remove(item3D);
    disposeObject(item3D);
    delete layerGraph.items[itemID];
    if (typeof onItemChanged === 'function') {
      onItemChanged(planData);
    }
  }
}

export function addStreamedItem(
  sceneData,
  planData,
  layer,
  itemID,
  itemsActions,
  onItemChanged,
) {
  const busyResources = planData.sceneGraph.busyResources.layers[layer.id].items;
  if (busyResources[itemID]) {
    setTimeout(
      () => addStreamedItem(sceneData, planData, layer, itemID, itemsActions, onItemChanged),
      100,
    );
    return Promise.resolve();
  }

  busyResources[itemID] = true;

  const item = layer.getIn(['items', itemID]);
  if (!item) {
    resetItemRetryState(planData, layer.id, itemID);
    busyResources[itemID] = false;
    return Promise.resolve();
  }

  const version = bumpItemVersion(planData, layer.id, itemID);
  clearItemRetryTimer(planData, layer.id, itemID);
  const asset = resolveItemAsset(item);
  const pivot = new Three.Object3D();
  pivot.name = 'pivot';
  pivot.userData = {
    elementType: 'items',
    elementID: itemID,
    layerID: layer.id,
    catalogType: getValue(item, 'type', ''),
    displayName: asset.displayName,
  };
  updatePivotItemBoundsMetadata(pivot, item, sceneData.unit);

  replacePivotContents(pivot, createPlaceholderObject(item, sceneData.unit));
  updateStreamedItemTransform(pivot, item, layer);
  applyInteract(pivot, getSelectItemInteract(itemsActions, layer.id, itemID));
  applyOpacity(pivot, item.selected ? 1 : layer.opacity);

  const existingPivot = planData.sceneGraph.layers[layer.id].items[itemID];
  if (existingPivot && existingPivot !== pivot) {
    planData.plan.remove(existingPivot);
    disposeObject(existingPivot);
  }

  planData.plan.add(pivot);
  planData.sceneGraph.layers[layer.id].items[itemID] = pivot;
  busyResources[itemID] = false;

  if (typeof onItemChanged === 'function') {
    onItemChanged(planData);
  }

  if (!asset.modelUrl) {
    resetItemRetryState(planData, layer.id, itemID);
    console.warn(
      `[item-loader] Missing model URL for item "${itemID}" (${asset.displayName}).`,
    );
    replacePivotContents(pivot, createFallbackObject(item, sceneData.unit));
    applyInteract(pivot, getSelectItemInteract(itemsActions, layer.id, itemID));
    applyOpacity(pivot, item.selected ? 1 : layer.opacity);
    if (typeof onItemChanged === 'function') {
      onItemChanged(planData);
    }
    return Promise.resolve(pivot);
  }

  return buildLoadedItemObject(item, sceneData, asset.modelUrl)
    .then((itemObject) => {
      if (!isCurrentItemVersion(planData, layer.id, itemID, version)) {
        disposeObject(itemObject);
        return null;
      }

      replacePivotContents(pivot, itemObject);
      applyInteract(pivot, getSelectItemInteract(itemsActions, layer.id, itemID));
      applyOpacity(pivot, item.selected ? 1 : layer.opacity);

      if (typeof onItemChanged === 'function') {
        onItemChanged(planData);
      }

      resetItemRetryState(planData, layer.id, itemID);
      return pivot;
    })
    .catch((error) => {
      if (!isCurrentItemVersion(planData, layer.id, itemID, version)) {
        return null;
      }

      const retryCount = getItemRetryCount(planData, layer.id, itemID);
      if (retryCount < MAX_MODEL_LOAD_RETRY_ATTEMPTS) {
        const nextRetryAttempt = retryCount + 1;
        setItemRetryCount(planData, layer.id, itemID, nextRetryAttempt);
        console.warn(
          `[item-loader] Retrying load for item "${itemID}" (${nextRetryAttempt}/${MAX_MODEL_LOAD_RETRY_ATTEMPTS}).`,
          error,
        );
        replacePivotContents(pivot, createPlaceholderObject(item, sceneData.unit));
        applyInteract(pivot, getSelectItemInteract(itemsActions, layer.id, itemID));
        applyOpacity(pivot, item.selected ? 1 : layer.opacity);

        if (typeof onItemChanged === 'function') {
          onItemChanged(planData);
        }

        scheduleItemLoadRetry(
          planData,
          layer.id,
          itemID,
          nextRetryAttempt,
          () => {
            addStreamedItem(
              sceneData,
              planData,
              layer,
              itemID,
              itemsActions,
              onItemChanged,
            ).catch((retryError) => {
              console.error(
                `[item-loader] Retry scheduling failed for item "${itemID}".`,
                retryError,
              );
            });
          },
        );

        return null;
      }

      resetItemRetryState(planData, layer.id, itemID);
      console.error(
        `[item-loader] Failed to load model for item "${itemID}" from "${asset.modelUrl}"`,
        error,
      );
      replacePivotContents(pivot, createFallbackObject(item, sceneData.unit));
      applyInteract(pivot, getSelectItemInteract(itemsActions, layer.id, itemID));
      applyOpacity(pivot, item.selected ? 1 : layer.opacity);

      if (typeof onItemChanged === 'function') {
        onItemChanged(planData);
      }

      return null;
    });
}

export function updateStreamedItem(
  sceneData,
  oldSceneData,
  planData,
  layer,
  itemID,
  differences,
  itemsActions,
  rebuild,
  onItemChanged,
) {
  const item = layer.getIn(['items', itemID]);
  const mesh = planData.sceneGraph.layers[layer.id].items[itemID];

  if (!item || !mesh) return null;

  const changedKeys = Array.isArray(differences) ? differences : [];
  const transformOnly = changedKeys.every((key) =>
    ['x', 'y', 'rotation', 'selected'].includes(key),
  );

  if (transformOnly) {
    updateStreamedItemTransform(mesh, item, layer);
    applyOpacity(mesh, item.selected ? 1 : layer.opacity);
    if (typeof onItemChanged === 'function') {
      onItemChanged(planData);
    }
    return Promise.resolve(mesh);
  }

  return rebuild();
}
