import * as Three from 'three';
import { disposeObject } from './three-memory-cleaner';
import { wallVisibilityManager } from './wall-visibility-manager';
import {
  addStreamedItem,
  removeStreamedItem,
  updateStreamedItem,
} from './item-loader';
import {
  createLayerBuildTasks,
  initializePlanData,
} from './scene-builder';

function normalizeParseCallbacks(callbacks) {
  if (typeof callbacks === 'function') {
    return {
      onSceneReady: callbacks,
      onBoundsUpdated: null,
    };
  }

  return {
    onSceneReady:
      typeof callbacks?.onSceneReady === 'function'
        ? callbacks.onSceneReady
        : null,
    onBoundsUpdated:
      typeof callbacks?.onBoundsUpdated === 'function'
        ? callbacks.onBoundsUpdated
        : null,
  };
}

export function parseData(sceneData, actions, catalog, callbacks) {
  const parseCallbacks = normalizeParseCallbacks(callbacks);
  const planData = initializePlanData(sceneData, parseCallbacks.onBoundsUpdated);
  let staticPromises = [];

  sceneData.layers.forEach(layer => {
    if (layer.id === sceneData.selectedLayer || layer.visible) {
      const layerTasks = createLayerObjects(
        layer,
        planData,
        sceneData,
        actions,
        catalog,
      );
      staticPromises = staticPromises.concat(layerTasks.staticPromises);
    }
  });

  Promise.all(staticPromises).then(() =>
    updateBoundingBox(planData, parseCallbacks.onSceneReady),
  );

  return planData;
}

function createLayerObjects(layer, planData, sceneData, actions, catalog) {
  return createLayerBuildTasks({
    layer,
    planData,
    sceneData,
    actions,
    catalog,
    addLine,
    addHole,
    addArea,
    addItem,
  });
}

export function updateScene(planData, sceneData, oldSceneData, diffArray, actions, catalog, onBoundingBoxUpdated) {

  // Optional hook for consumers (e.g. Viewer3D) to react after bounds are recomputed.
  // Stored on planData so we don't have to thread it through dozens of internal calls.
  if (planData) {
    planData._onBoundingBoxUpdated = typeof onBoundingBoxUpdated === 'function' ? onBoundingBoxUpdated : null;
  }

  let splitted = diffArray.map( el => { return { op: el.op, path: el.path.split('/'), value: el.value }; } );
  let filteredDiffs = filterDiffs(splitted, sceneData, oldSceneData);

  // Skip selection and group changes
  filteredDiffs = filteredDiffs.filter( ({path}) => !path.includes('selected') );
  filteredDiffs = filteredDiffs.filter( ({path}) => path[1] !== 'groups' );

  // Deduplicate by element ID so e.g. both x+y diffs for the same vertex
  // only trigger one rebuild
  const seenElements = new Set();
  filteredDiffs = filteredDiffs.filter(({path}) => {
    if (path[1] === 'layers' && path.length > 4 &&
        (path[3] === 'items' || path[3] === 'holes' || path[3] === 'lines' ||
         path[3] === 'areas' || path[3] === 'vertices')) {
      const key = `${path[2]}/${path[3]}/${path[4]}`;
      if (seenElements.has(key)) return false;
      seenElements.add(key);
    }
    return true;
  });

  // Reset per-frame dedup tracker (prevents rebuilding the same wall/area twice
  // when both endpoints of a wall move in the same dispatch)
  _rebuiltWallsThisFrame = new Set();

  filteredDiffs.forEach(({op, path, value}) => {
    if (path[1] === 'layers') {

      let layer = sceneData.getIn(['layers', path[2]]);

      if (path.length === 3 && op === 'remove') {
        removeLayer(path[2], planData);
      } else if (path.length > 3) {
        switch (op) {
          case 'replace':
            replaceObject(path, layer, planData, actions, sceneData, oldSceneData, catalog);
            break;
          case 'add':
            addObject(path, layer, planData, actions, sceneData, oldSceneData, catalog);
            break;
          case 'remove':
            removeObject(path, layer, planData, actions, sceneData, oldSceneData, catalog);
            break;
        }
      }
    } else if (path[1] === 'selectedLayer') {
      let layerSelectedID = value;
      let layerSelected = sceneData.getIn(['layers', layerSelectedID]);
      // If the newly selected layer was hidden, create its 3D objects now
      if (!layerSelected.visible) {
        const layerTasks = createLayerObjects(
          layerSelected,
          planData,
          sceneData,
          actions,
          catalog,
        );
        Promise.all(layerTasks.staticPromises).then(() => updateBoundingBox(planData));
      }

      let layerGraph = planData.sceneGraph.layers[oldSceneData.selectedLayer];

      if (layerGraph) {
        if (!layerGraph.visible) {
          // Tear down the previously-selected layer if it was only shown because it was active
          for (let lineID in layerGraph.lines) removeLine(planData, layerGraph.id, lineID);
          for (let areaID in layerGraph.areas) removeArea(planData, layerGraph.id, areaID);
          for (let itemID in layerGraph.items) removeItem(planData, layerGraph.id, itemID);
          for (let holeID in layerGraph.holes) removeHole(planData, layerGraph.id, holeID);
        }
      }
    }
  });
  return planData;
}

// Scans layer.areas to find areas containing any of the given vertex IDs.
// (vertex.areas backward-refs are never populated in Redux, so we have to scan.)
function findAreasForVertices(layer, vertexIDs) {
  const vSet = new Set(vertexIDs);
  const seen = new Set();
  const areaIDs = [];
  layer.areas.forEach(area => {
    if (seen.has(area.id)) return;
    const verts = area.vertices || (area.get && area.get('vertices'));
    if (!verts) return;
    verts.forEach(vid => {
      if (vSet.has(vid)) {
        seen.add(area.id);
        areaIDs.push(area.id);
        return false; // stop Immutable forEach for this area
      }
    });
  });
  return areaIDs;
}

// Tracks which walls/areas have already been rebuilt inside a single updateScene pass.
// Prevents double-rebuilds when e.g. both endpoints of a wall move in the same dispatch.
let _rebuiltWallsThisFrame = null;

// ─── Helpers to avoid duplicating rebuild logic across vertex/line/add cases ───

// Rebuild a single wall (line) and all its holes.
function rebuildWall(sceneData, planData, layer, lineID, catalog, actions) {
  const lineHoles = layer.getIn(['lines', lineID, 'holes']);
  if (lineHoles) lineHoles.forEach(hid => removeHole(planData, layer.id, hid));
  removeLine(planData, layer.id, lineID);
  const promises = [addLine(sceneData, planData, layer, lineID, catalog, actions.linesActions)];
  if (lineHoles) lineHoles.forEach(hid =>
    promises.push(addHole(sceneData, planData, layer, hid, catalog, actions.holesActions)));
  return promises;
}

// Force-remove an area mesh (bypasses busyResources guard) and re-add it.
function forceRebuildArea(sceneData, planData, layer, areaID, catalog, actions) {
  const oldMesh = planData.sceneGraph.layers[layer.id]?.areas[areaID];
  if (oldMesh) {
    wallVisibilityManager.unregisterArea(areaID);
    planData.plan.remove(oldMesh);
    disposeObject(oldMesh);
    delete planData.sceneGraph.layers[layer.id].areas[areaID];
    delete planData.sceneGraph.LODs[areaID];
  }
  // Force-clear busy flag so addArea proceeds unconditionally
  planData.sceneGraph.busyResources.layers[layer.id].areas[areaID] = false;
  return addArea(sceneData, planData, layer, areaID, catalog, actions.areaActions);
}

// Rebuild adjacent walls sharing a vertex with `lineID` (for miter updates)
// and any areas connected to those vertices.
function rebuildAdjacentWallsAndAreas(sceneData, planData, layer, lineID, catalog, actions) {
  const lineEl = layer.getIn(['lines', lineID]);
  if (!lineEl) return [];
  const promises = [];
  const vertexIDs = lineEl.vertices.toArray();

  vertexIDs.forEach(vertexID => {
    const vertex = layer.vertices.get(vertexID);
    if (!vertex) return;

    // Re-miter adjacent walls
    vertex.lines.forEach(adjLineID => {
      if (adjLineID === lineID) return;
      const adjKey = `${layer.id}/${adjLineID}`;
      if (_rebuiltWallsThisFrame?.has(adjKey)) return;
      _rebuiltWallsThisFrame?.add(adjKey);
      promises.push(...rebuildWall(sceneData, planData, layer, adjLineID, catalog, actions));
    });
  });

  // Rebuild connected areas
  const connectedAreaIDs = findAreasForVertices(layer, vertexIDs);
  connectedAreaIDs.forEach(areaID => {
    const areaKey = `${layer.id}/area/${areaID}`;
    if (_rebuiltWallsThisFrame?.has(areaKey)) return;
    _rebuiltWallsThisFrame?.add(areaKey);
    promises.push(forceRebuildArea(sceneData, planData, layer, areaID, catalog, actions));
  });

  return promises;
}

function replaceObject(modifiedPath, layer, planData, actions, sceneData, oldSceneData, catalog) {

  let promises = [];

  switch (modifiedPath[3]) {
    case 'vertices':
      if (modifiedPath[5] !== 'selected') {
        let vertex = layer.getIn(['vertices', modifiedPath[4]]);

        if (modifiedPath[5] === 'x' || modifiedPath[5] === 'y') {
          // Rebuild every wall attached to this vertex (with dedup)
          vertex.lines.forEach(lineID => {
            const wallKey = `${layer.id}/${lineID}`;
            if (_rebuiltWallsThisFrame?.has(wallKey)) return;
            _rebuiltWallsThisFrame?.add(wallKey);
            promises.push(...rebuildWall(sceneData, planData, layer, lineID, catalog, actions));
          });

          // Rebuild areas that contain this vertex
          const areaIDs = findAreasForVertices(layer, [modifiedPath[4]]);
          areaIDs.forEach(areaID => {
            const areaKey = `${layer.id}/area/${areaID}`;
            if (_rebuiltWallsThisFrame?.has(areaKey)) return;
            _rebuiltWallsThisFrame?.add(areaKey);
            promises.push(forceRebuildArea(sceneData, planData, layer, areaID, catalog, actions));
          });
        }

        if (modifiedPath[5] === 'areas') {
          let areaID = vertex.getIn(['areas', ~~modifiedPath[6]]);
          replaceObject([0, 0, 0, 'areas', areaID], layer, planData, actions, sceneData, oldSceneData, catalog);
        }
      }
      break;
    case 'holes': {
      let newHoleData = layer.getIn(['holes', modifiedPath[4]]);
      // Rebuild the parent wall so the hole cutout is re-computed
      let lineID = newHoleData.line;
      promises.push(...rebuildWall(sceneData, planData, layer, lineID, catalog, actions));
      break;
    }
    case 'lines': {
      const lineID4 = modifiedPath[4];
      let lineEl = layer.getIn(['lines', lineID4]);

      // Rebuild the wall itself
      if (catalog.getElement(lineEl.type).updateRender3D) {
        promises.push(
          updateLine(
            sceneData, oldSceneData, planData, layer, lineID4,
            modifiedPath.slice(5), catalog, actions.linesActions,
            () => removeLine(planData, layer.id, lineID4),
            () => addLine(sceneData, planData, layer, lineID4, catalog, actions.linesActions)
          )
        );
      } else {
        removeLine(planData, layer.id, lineID4);
        promises.push(addLine(sceneData, planData, layer, lineID4, catalog, actions.linesActions));
      }

      // When a wall's vertex reference changes, rebuild adjacent walls (for miter)
      // and connected areas (floor polygon depends on vertices)
      if (modifiedPath[5] === 'vertices') {
        promises.push(...rebuildAdjacentWallsAndAreas(sceneData, planData, layer, lineID4, catalog, actions));
      }
      break;
    }
    case 'areas': {
      let area = layer.getIn(['areas', modifiedPath[4]]);

      // Handle both Record and plain Map (can happen with corrupt autosave data)
      const areaType = (area && typeof area.type === 'string' && area.type)
        || (area && typeof area.get === 'function' && area.get('type'))
        || null;

      if (!areaType) break; // Skip corrupt/incomplete area data

      if (catalog.getElement(areaType).updateRender3D) {
        promises.push(
          updateArea(
            sceneData,
            oldSceneData,
            planData,
            layer,
            modifiedPath[4],
            modifiedPath.slice(5),
            catalog,
            actions.areaActions,
            () => removeArea(planData, layer.id, modifiedPath[4]),
            () => addArea(sceneData, planData, layer, modifiedPath[4], catalog, actions.areaActions)
          )
        );
      }
      else {
        if (planData.sceneGraph.layers[layer.id].areas[modifiedPath[4]]) {
          removeArea(planData, layer.id, modifiedPath[4]);
        }
        promises.push(addArea(sceneData, planData, layer, modifiedPath[4], catalog, actions.areaActions));
      }
      break;
    }
    case 'items':
      promises.push(
        Promise.resolve(
          updateItem(
            sceneData,
            oldSceneData,
            planData,
            layer,
            modifiedPath[4],
            modifiedPath.slice(5),
            catalog,
            actions.itemsActions,
            () => {
              removeItem(planData, layer.id, modifiedPath[4]);
              return addItem(
                sceneData,
                planData,
                layer,
                modifiedPath[4],
                catalog,
                actions.itemsActions,
              );
            },
          ),
        ),
      );
      break;

    case 'visible':
      if (!layer.visible) {
        let layerGraph = planData.sceneGraph.layers[layer.id];

        for (let lineID in layerGraph.lines) removeLine(planData, layer.id, lineID);
        for (let areaID in layerGraph.areas) removeArea(planData, layer.id, areaID);
        for (let itemID in layerGraph.items) removeItem(planData, layer.id, itemID);
        for (let holeID in layerGraph.holes) removeHole(planData, layer.id, holeID);

      } else {
        promises = promises.concat(
          createLayerObjects(layer, planData, sceneData, actions, catalog).promises,
        );
      }

      break;

    case 'opacity':
    case 'altitude':
      let layerGraph = planData.sceneGraph.layers[layer.id];
      for (let lineID in layerGraph.lines) removeLine(planData, layer.id, lineID);
      for (let areaID in layerGraph.areas) removeArea(planData, layer.id, areaID);
      for (let itemID in layerGraph.items) removeItem(planData, layer.id, itemID);
      for (let holeID in layerGraph.holes) removeHole(planData, layer.id, holeID);

      promises = promises.concat(
        createLayerObjects(layer, planData, sceneData, actions, catalog).promises,
      );

  }
  Promise.all(promises).then(values => updateBoundingBox(planData));
}

function removeObject(modifiedPath, layer, planData, actions, sceneData, oldSceneData, catalog) {

  let promises = [];
  switch (modifiedPath[3]) {
    case 'lines':
      // Remove line and all its holes
      let lineID = modifiedPath[4];
      oldSceneData.getIn(['layers', layer.id, 'lines', lineID, 'holes']).forEach(holeID => {
        removeHole(planData, layer.id, holeID);
      });
      removeLine(planData, layer.id, lineID);
      if (modifiedPath.length > 5) {
        // A hole was removed — rebuild the line with remaining holes
        promises.push(addLine(sceneData, planData, layer, lineID, catalog, actions.linesActions));
        layer.getIn(['lines', lineID, 'holes']).forEach(holeID => {
          promises.push(addHole(sceneData, planData, layer, holeID, catalog, actions.holesActions));
        });
      }
      break;
    case 'areas':
      if (modifiedPath.length === 5) {
        removeArea(planData, layer.id, modifiedPath[4]);
      }
      break;
    case 'items':
      if (modifiedPath.length === 5) {
        removeItem(planData, layer.id, modifiedPath[4]);
      }
      break;
  }

  Promise.all(promises).then(values => updateBoundingBox(planData));
}

function removeLayer(layerId, planData) {
  let layerGraph = planData.sceneGraph.layers[layerId];
  for (let lineID in layerGraph.lines) removeLine(planData, layerId, lineID);
  for (let areaID in layerGraph.areas) removeArea(planData, layerId, areaID);
  for (let itemID in layerGraph.items) removeItem(planData, layerId, itemID);
  for (let holeID in layerGraph.holes) removeHole(planData, layerId, holeID);
  delete planData.sceneGraph.layers[layerId];
}

function removeHole(planData, layerId, holeID) {

  if (planData.sceneGraph.busyResources.layers[layerId].holes[holeID]) {
    setTimeout(() => removeHole(planData, layerId, holeID), 100);
    return;
  }

  planData.sceneGraph.busyResources.layers[layerId].holes[holeID] = true;

  let hole3D = planData.sceneGraph.layers[layerId].holes[holeID];

  if (hole3D) {
    planData.plan.remove(hole3D);
    disposeObject(hole3D);
    delete planData.sceneGraph.layers[layerId].holes[holeID];
    delete planData.sceneGraph.LODs[holeID];
    hole3D = null;
    updateBoundingBox(planData);
  }

  planData.sceneGraph.busyResources.layers[layerId].holes[holeID] = false;
}

function removeLine(planData, layerId, lineID) {

  if (planData.sceneGraph.busyResources.layers[layerId].lines[lineID]) {
    setTimeout(() => removeLine(planData, layerId, lineID), 100);
    return;
  }

  planData.sceneGraph.busyResources.layers[layerId].lines[lineID] = true;

  let line3D = planData.sceneGraph.layers[layerId].lines[lineID];

  if (line3D) {
    wallVisibilityManager.unregisterWall(lineID);
    
    planData.plan.remove(line3D);
    disposeObject(line3D);
    delete planData.sceneGraph.layers[layerId].lines[lineID];
    delete planData.sceneGraph.LODs[lineID];
    line3D = null;
    updateBoundingBox(planData);
  }

  planData.sceneGraph.busyResources.layers[layerId].lines[lineID] = false;
}

function removeArea(planData, layerId, areaID) {

  if (planData.sceneGraph.busyResources.layers[layerId].areas[areaID]) {
    setTimeout(() => removeArea(planData, layerId, areaID), 100);
    return;
  }

  planData.sceneGraph.busyResources.layers[layerId].areas[areaID] = true;

  let area3D = planData.sceneGraph.layers[layerId].areas[areaID];

  if (area3D) {
    wallVisibilityManager.unregisterArea(areaID);
    planData.plan.remove(area3D);
    disposeObject(area3D);
    delete planData.sceneGraph.layers[layerId].areas[areaID];
    delete planData.sceneGraph.LODs[areaID];
    area3D = null;
    updateBoundingBox(planData);
  }

  planData.sceneGraph.busyResources.layers[layerId].areas[areaID] = false;
}

function removeItem(planData, layerId, itemID) {
  if (planData.sceneGraph.busyResources.layers[layerId].items[itemID]) {
    setTimeout(() => removeItem(planData, layerId, itemID), 100);
    return;
  }

  planData.sceneGraph.busyResources.layers[layerId].items[itemID] = true;
  removeStreamedItem(planData, layerId, itemID, updateBoundingBox);
  delete planData.sceneGraph.LODs[itemID];
  planData.sceneGraph.busyResources.layers[layerId].items[itemID] = false;
}

function addObject(modifiedPath, layer, planData, actions, sceneData, oldSceneData, catalog) {
  if (modifiedPath.length === 5) {
    let addPromise = null, addAction = null;

    switch (modifiedPath[3]) {
      case 'lines': {
        // Add the new wall, then rebuild adjacent walls for miter + connected areas
        addLine(sceneData, planData, layer, modifiedPath[4], catalog, actions.linesActions).then(() => {
          updateBoundingBox(planData);
          const p = rebuildAdjacentWallsAndAreas(sceneData, planData, layer, modifiedPath[4], catalog, actions);
          Promise.all(p).then(() => updateBoundingBox(planData));
        });
        return;
      }
      case 'areas': addPromise = addArea; addAction = actions.areaActions;  break;
      case 'items': addPromise = addItem; addAction = actions.itemsActions; break;
      case 'holes': {
        // Rebuild the parent wall so the new hole is cut into it
        let holeData = layer.getIn(['holes', modifiedPath[4]]);
        if (holeData && holeData.line) {
          let lineID = holeData.line;
          removeLine(planData, layer.id, lineID);
          addLine(sceneData, planData, layer, lineID, catalog, actions.linesActions).then(() => {
            addHole(sceneData, planData, layer, modifiedPath[4], catalog, actions.holesActions)
              .then(() => updateBoundingBox(planData));
          });
          return;
        }
        addPromise = addHole; 
        addAction = actions.holesActions; 
        break;
      }
    }

    if( addPromise ) addPromise( sceneData, planData, layer, modifiedPath[4], catalog, addAction, actions.projectActions ).then(() => updateBoundingBox(planData));
  }
}

function addHole(sceneData, planData, layer, holeID, catalog, holesActions) {
  let holeData = layer.getIn(['holes', holeID]);

  // Skip holes with missing data (prevents corrupt state)
  if (!holeData || !holeData.type || !holeData.line) {
    return Promise.resolve();
  }

  return catalog.getElement(holeData.type).render3D(holeData, layer, sceneData).then(object => {

    if (object instanceof Three.LOD) {
      planData.sceneGraph.LODs[holeID] = object;
    }

    // Remove BoxHelpers injected by catalog render3D (we manage selection boxes at scene level)
    const catalogBoxes = [];
    object.traverse(child => {
      if (child instanceof Three.BoxHelper) catalogBoxes.push(child);
    });
    catalogBoxes.forEach(b => {
      if (b.parent) b.parent.remove(b);
      b.geometry?.dispose();
      b.material?.dispose();
    });
    if (catalogBoxes.length > 0) {
      console.log(`[addHole] Removed ${catalogBoxes.length} BoxHelper(s) from hole "${holeData.type}" (${holeID})`);
    }

    let pivot = new Three.Object3D();
    pivot.name = 'pivot';
    pivot.add(object);

    const holeTypeLower = (holeData.type || '').toLowerCase();
    const holeCatalogElement = catalog.getElement(holeData.type);
    const displayName = String(holeCatalogElement?.info?.title || holeData.type || 'hole').trim();
    pivot.userData = {
      elementType: 'holes',
      elementID: holeID,
      layerID: layer.id,
      catalogType: holeData.type,
      displayName,
      holeType: holeTypeLower.includes('window') ? 'window'
              : holeTypeLower.includes('door')   ? 'door'
              : 'hole',
    };

    let line = layer.getIn(['lines', holeData.line]);

    let vertex0 = layer.vertices.get(line.vertices.get(0));
    let vertex1 = layer.vertices.get(line.vertices.get(1));
    let offset = holeData.offset;

    if (vertex0.x > vertex1.x) {
      let tmp = vertex0;
      vertex0 = vertex1;
      vertex1 = tmp;
      offset = 1 - offset;
    }

    let distance = Math.sqrt(Math.pow(vertex0.x - vertex1.x, 2) + Math.pow(vertex0.y - vertex1.y, 2));
    let alpha = Math.asin((vertex1.y - vertex0.y) / distance);

    let boundingBox = new Three.Box3().setFromObject(pivot);
    let center = [
      (boundingBox.max.x - boundingBox.min.x) / 2 + boundingBox.min.x,
      (boundingBox.max.y - boundingBox.min.y) / 2 + boundingBox.min.y,
      (boundingBox.max.z - boundingBox.min.z) / 2 + boundingBox.min.z];

    // Altitude relative to slab top
    let holeAltitude = holeData.properties.getIn(['altitude', 'length']);
    let holeHeight = holeData.properties.getIn(['height', 'length']);
    
    let slabHeight = 20;
    try {
      layer.areas.forEach(area => {
        if (area && area.get('properties')) {
          const areaFloorThickness = area.getIn(['properties', 'floorThickness', 'length']);
          if (areaFloorThickness) {
            slabHeight = areaFloorThickness;
            return false; // break
          }
        }
      });
    } catch (e) { /* use default */ }
    
    let effectiveAltitude = Math.max(holeAltitude, 0);
    let absoluteAltitude = slabHeight + effectiveAltitude;

    pivot.rotation.y = alpha;
    pivot.position.x = vertex0.x + distance * offset * Math.cos(alpha) - center[2] * Math.sin(alpha);
    pivot.position.y = absoluteAltitude + holeHeight / 2 - center[1] + layer.altitude;
    pivot.position.z = -vertex0.y - distance * offset * Math.sin(alpha) - center[2] * Math.cos(alpha);

    planData.plan.add(pivot);
    // Use holeID (the Map key) — holeData.id can be '' on malformed saves
    planData.sceneGraph.layers[layer.id].holes[holeID] = pivot;

    // Enable transparency so holes can fade with their parent wall
    pivot.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => { m.transparent = true; });
      }
    });

    applyInteract(pivot, () => {
      return holesActions.selectHole(layer.id, holeID);
    });

    let opacity = layer.opacity;
    if (holeData.selected) {
      opacity = 1;
    }
    applyOpacity(pivot, opacity);

  });
}

function updateHole(sceneData, oldSceneData, planData, layer, holeID, differences, catalog, holesActions, selfDestroy, selfBuild) {
  let hole = layer.getIn(['holes', holeID]);
  let oldHole = oldSceneData.getIn(['layers', layer.id, 'holes', holeID]);
  let mesh = planData.sceneGraph.layers[layer.id].holes[holeID];

  if (!mesh) return null;

  return catalog.getElement(hole.type).updateRender3D(hole, layer, sceneData, mesh, oldHole, differences, selfDestroy, selfBuild);
}

function addLine(sceneData, planData, layer, lineID, catalog, linesActions) {
  const busy = planData.sceneGraph.busyResources.layers[layer.id].lines[lineID];
  if (busy) {
    setTimeout(() => addLine(sceneData, planData, layer, lineID, catalog, linesActions), 100);
    return Promise.resolve();
  }

  planData.sceneGraph.busyResources.layers[layer.id].lines[lineID] = true;

  let line = layer.getIn(['lines', lineID]);

  let vertex0 = layer.vertices.get(line.vertices.get(0));
  let vertex1 = layer.vertices.get(line.vertices.get(1));
  let inverted = false;

  if (vertex0.x > vertex1.x) {
    let tmp = vertex0;
    vertex0 = vertex1;
    vertex1 = tmp;
    inverted = true;
  }

  return catalog.getElement(line.type).render3D(line, layer, sceneData).then(line3D => {

    if (line3D instanceof Three.LOD) {
      planData.sceneGraph.LODs[line.id] = line3D;
    }

    let pivot = new Three.Object3D();
    pivot.name = 'pivot';
    pivot.add(line3D);
    pivot.userData = { elementType: 'lines', elementID: lineID, layerID: layer.id };

    pivot.position.x = vertex0.x;
    pivot.position.y = layer.altitude;
    pivot.position.z = -vertex0.y;

    planData.plan.add(pivot);
    planData.sceneGraph.layers[layer.id].lines[lineID] = pivot;
    
    // Register with visibility manager for camera-based wall hiding
    const vertices = {
      get: (index) => index === 0 ? vertex0 : vertex1
    };
    wallVisibilityManager.registerWall(lineID, pivot, line, vertices, inverted);

    applyInteract(pivot, () => {
      return linesActions.selectLine(layer.id, line.id);
    });

    let opacity = layer.opacity;
    if (line.selected) {
      opacity = 1;
    }
    applyOpacity(pivot, opacity);
    planData.sceneGraph.busyResources.layers[layer.id].lines[lineID] = false;
  }).catch(err => {
    planData.sceneGraph.busyResources.layers[layer.id].lines[lineID] = false;
  });
}

function updateLine(sceneData, oldSceneData, planData, layer, lineID, differences, catalog, linesActions, selfDestroy, selfBuild) {
  let line = layer.getIn(['lines', lineID]);
  let oldLine = oldSceneData.getIn(['layers', layer.id, 'lines', lineID]);
  let mesh = planData.sceneGraph.layers[layer.id].lines[lineID];

  if (!mesh) return null;

  // Re-register with visibility manager if sideAInside changed
  const oldSideA = oldLine && oldLine.properties ? oldLine.properties.get('sideAInside') : undefined;
  const newSideA = line.properties ? line.properties.get('sideAInside') : undefined;
  if (oldSideA !== newSideA) {
    let vertex0 = layer.vertices.get(line.vertices.get(0));
    let vertex1 = layer.vertices.get(line.vertices.get(1));
    let inverted = false;
    if (vertex0.x > vertex1.x) {
      let tmp = vertex0;
      vertex0 = vertex1;
      vertex1 = tmp;
      inverted = true;
    }
    wallVisibilityManager.unregisterWall(lineID);
    const vertices = { get: (index) => index === 0 ? vertex0 : vertex1 };
    wallVisibilityManager.registerWall(lineID, mesh, line, vertices, inverted);
  }

  return catalog.getElement(line.type).updateRender3D(line, layer, sceneData, mesh, oldLine, differences, selfDestroy, selfBuild);
}

function addArea(sceneData, planData, layer, areaID, catalog, areaActions) {
  const busy = planData.sceneGraph.busyResources.layers[layer.id].areas[areaID];
  if (busy) {
    setTimeout(() => addArea(sceneData, planData, layer, areaID, catalog, areaActions), 100);
    return Promise.resolve();
  }

  planData.sceneGraph.busyResources.layers[layer.id].areas[areaID] = true;

  let area = layer.getIn(['areas', areaID]);

  // Handle both Record and plain Map (corrupt autosave data)
  const areaType = (area && typeof area.type === 'string' && area.type)
    || (area && typeof area.get === 'function' && area.get('type'))
    || null;

  if (!areaType) {
    planData.sceneGraph.busyResources.layers[layer.id].areas[areaID] = false;
    return Promise.resolve();
  }

  let interactFunction = () => areaActions.selectArea(layer.id, areaID);

  return catalog.getElement(areaType).render3D(area, layer, sceneData).then(area3D => {

    if (area3D instanceof Three.LOD) {
      planData.sceneGraph.LODs[areaID] = area3D;
    }

    let pivot = new Three.Object3D();
    pivot.name = 'pivot';
    pivot.add(area3D);
    pivot.userData = { elementType: 'areas', elementID: areaID, layerID: layer.id };
    pivot.position.y = layer.altitude;
    planData.plan.add(pivot);
    planData.sceneGraph.layers[layer.id].areas[areaID] = pivot;

    wallVisibilityManager.registerArea(areaID, pivot);

    applyInteract(pivot, interactFunction);

    let opacity = layer.opacity;
    if (area.selected) {
      opacity = 1;
    }

    applyOpacity(pivot, opacity);
    planData.sceneGraph.busyResources.layers[layer.id].areas[areaID] = false;
  }).catch(err => {
    // Always release the lock so future operations aren't permanently blocked
    planData.sceneGraph.busyResources.layers[layer.id].areas[areaID] = false;
  });
}

function updateArea(sceneData, oldSceneData, planData, layer, areaID, differences, catalog, areaActions, selfDestroy, selfBuild) {
  let area = layer.getIn(['areas', areaID]);
  let oldArea = oldSceneData.getIn(['layers', layer.id, 'areas', areaID]);
  let mesh = planData.sceneGraph.layers[layer.id].areas[areaID];

  if (!mesh) return null;

  return catalog.getElement(area.type).updateRender3D(area, layer, sceneData, mesh, oldArea, differences, selfDestroy, selfBuild);
}

function addItem(sceneData, planData, layer, itemID, catalog, itemsActions) {
  return addStreamedItem(
    sceneData,
    planData,
    layer,
    itemID,
    itemsActions,
    updateBoundingBox,
  );
}

function updateItem(sceneData, oldSceneData, planData, layer, itemID, differences, catalog, itemsActions, rebuild) {
  return updateStreamedItem(
    sceneData,
    oldSceneData,
    planData,
    layer,
    itemID,
    differences,
    itemsActions,
    rebuild,
    updateBoundingBox,
  );
}

// Apply interact function to children of an Object3D
function applyInteract(object, interactFunction) {
  object.traverse((child) => {
    if (child instanceof Three.Mesh) {
      child.interact = interactFunction;
    }
  });
}

// Apply opacity to children of an Object3D
function applyOpacity(object, opacity) {
  object.traverse((child) => {
    if (child instanceof Three.Mesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        mat.transparent = true;
        if (mat.maxOpacity) {
          mat.opacity = Math.min(mat.maxOpacity, opacity);
        } else if (mat.opacity && mat.opacity > opacity) {
          mat.maxOpacity = mat.opacity;
          mat.opacity = opacity;
        }
      });
    }
  });
}

function getItemBoundingBox(itemObj) {
  const itemBounds = itemObj?.userData?.itemBounds;
  const hasItemBounds =
    itemBounds &&
    Number.isFinite(itemBounds.halfWidth) &&
    Number.isFinite(itemBounds.halfDepth) &&
    Number.isFinite(itemBounds.minY) &&
    Number.isFinite(itemBounds.maxY);

  if (!hasItemBounds) {
    return new Three.Box3().setFromObject(itemObj);
  }

  const halfWidth = Math.max(itemBounds.halfWidth, 0);
  const halfDepth = Math.max(itemBounds.halfDepth, 0);
  const rotationY = Number(itemObj.rotation?.y || 0);
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const worldHalfX = halfWidth * cos + halfDepth * sin;
  const worldHalfZ = halfWidth * sin + halfDepth * cos;

  const px = Number(itemObj.position?.x || 0);
  const py = Number(itemObj.position?.y || 0);
  const pz = Number(itemObj.position?.z || 0);

  return new Three.Box3(
    new Three.Vector3(px - worldHalfX, py + itemBounds.minY, pz - worldHalfZ),
    new Three.Vector3(px + worldHalfX, py + itemBounds.maxY, pz + worldHalfZ),
  );
}

function expandBoundsWithBox(box, bounds) {
  if (
    !box ||
    !Number.isFinite(box.min?.x) ||
    !Number.isFinite(box.min?.y) ||
    !Number.isFinite(box.min?.z) ||
    !Number.isFinite(box.max?.x) ||
    !Number.isFinite(box.max?.y) ||
    !Number.isFinite(box.max?.z)
  ) {
    return false;
  }

  bounds.minX = Math.min(bounds.minX, box.min.x);
  bounds.minY = Math.min(bounds.minY, box.min.y);
  bounds.minZ = Math.min(bounds.minZ, box.min.z);
  bounds.maxX = Math.max(bounds.maxX, box.max.x);
  bounds.maxY = Math.max(bounds.maxY, box.max.y);
  bounds.maxZ = Math.max(bounds.maxZ, box.max.z);
  return true;
}


function updateBoundingBox(planData, onFirstUpdate) {
  const createBoundsAccumulator = () => ({
    minX: Infinity,
    minY: Infinity,
    minZ: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    maxZ: -Infinity,
  });
  const mergeBounds = (...accumulators) => {
    const merged = createBoundsAccumulator();
    accumulators.forEach((accumulator) => {
      if (!accumulator) return;
      merged.minX = Math.min(merged.minX, accumulator.minX);
      merged.minY = Math.min(merged.minY, accumulator.minY);
      merged.minZ = Math.min(merged.minZ, accumulator.minZ);
      merged.maxX = Math.max(merged.maxX, accumulator.maxX);
      merged.maxY = Math.max(merged.maxY, accumulator.maxY);
      merged.maxZ = Math.max(merged.maxZ, accumulator.maxZ);
    });
    return merged;
  };
  const cloneBounds = (source) => ({
    minX: source.minX,
    minY: source.minY,
    minZ: source.minZ,
    maxX: source.maxX,
    maxY: source.maxY,
    maxZ: source.maxZ,
  });

  const wallBounds = createBoundsAccumulator();
  const itemBounds = createBoundsAccumulator();
  const areaBounds = createBoundsAccumulator();
  let hasWalls = false;
  let hasItems = false;
  let hasAreas = false;

  // Iterate through all layers and their elements
  for (let layerId in planData.sceneGraph.layers) {
    let layer = planData.sceneGraph.layers[layerId];

    // Process lines
    for (let lineId in layer.lines) {
      let lineObj = layer.lines[lineId];
      if (lineObj && lineObj.position) {
        let box = new Three.Box3().setFromObject(lineObj);
        hasWalls = expandBoundsWithBox(box, wallBounds) || hasWalls;
      }
    }

    // Areas are used as a fallback when there are no walls/items.
    for (let areaId in layer.areas) {
      let areaObj = layer.areas[areaId];
      if (areaObj && areaObj.position) {
        let box = new Three.Box3().setFromObject(areaObj);
        hasAreas = expandBoundsWithBox(box, areaBounds) || hasAreas;
      }
    }

    // Items always use planner dimensions (2D width/depth/height projected into 3D).
    // This keeps camera fitting stable while streamed meshes are still loading.
    for (let itemId in layer.items) {
      let itemObj = layer.items[itemId];
      if (itemObj && itemObj.position) {
        let box = getItemBoundingBox(itemObj);
        hasItems = expandBoundsWithBox(box, itemBounds) || hasItems;
      }
    }
  }

  const hasElements = hasWalls || hasItems || hasAreas;
  let bounds = null;
  if (hasWalls && hasItems) {
    bounds = mergeBounds(wallBounds, itemBounds);
  } else if (hasWalls) {
    bounds = cloneBounds(wallBounds);
  } else if (hasItems) {
    bounds = cloneBounds(itemBounds);
  } else if (hasAreas) {
    bounds = cloneBounds(areaBounds);
  } else {
    bounds = createBoundsAccumulator();
  }

  // Empty scene fallback: use floor-plan dimensions so camera isn't at NaN
  if (!hasElements) {
    const w = planData.sceneGraph.width  || 12000;
    const h = planData.sceneGraph.height || 12000;
    bounds.minX = 0;   bounds.maxX = w;
    bounds.minY = 0;   bounds.maxY = 0;
    bounds.minZ = -h;  bounds.maxZ = 0;
  }

  const newCenter = new Three.Vector3(
    (bounds.maxX - bounds.minX) / 2 + bounds.minX,
    (bounds.maxY - bounds.minY) / 2 + bounds.minY,
    (bounds.maxZ - bounds.minZ) / 2 + bounds.minZ
  );
  planData.boundingBoxCenter = newCenter;
  planData.boundingBoxCenter.lenX = bounds.maxX - bounds.minX;
  planData.boundingBoxCenter.lenZ = bounds.maxZ - bounds.minZ;
  planData.boundingBoxHasGeometry = hasElements;

  // Always set boundingBox so downstream code can rely on it even for empty scenes.
  planData.boundingBox = {
    min: new Three.Vector3(bounds.minX, bounds.minY, bounds.minZ),
    max: new Three.Vector3(bounds.maxX, bounds.maxY, bounds.maxZ)
  };

  if (onFirstUpdate && typeof onFirstUpdate === 'function') {
    onFirstUpdate(planData);
  }

  const onUpdated = planData && planData._onBoundingBoxUpdated;
  if (typeof onUpdated === 'function') {
    onUpdated(planData);
  }
}

// Chain of diff filters to reduce unnecessary scene rebuilds
function filterDiffs(diffArray, sceneData, oldSceneData) {
  return minimizeRemoveDiffsWhenSwitchingLayers(
    minimizeChangePropertiesAfterSelectionsDiffs(
      minimizeChangePropertiesDiffs(diffArray, sceneData, oldSceneData), sceneData, oldSceneData),
    sceneData, oldSceneData);
}

// When switching away from a hidden layer, drop redundant remove diffs
function minimizeRemoveDiffsWhenSwitchingLayers(diffArray, sceneData, oldSceneData) {
  let foundDiff;
  for (let i = 0; i < diffArray.length && !foundDiff; i++) {
    if (diffArray[i].path[1] === 'selectedLayer') {
      foundDiff = diffArray[i];
    }
  }

  if (foundDiff) {
    if (!sceneData.getIn(['layers', oldSceneData.selectedLayer, 'visible'])) {
      return diffArray.filter(({op, path}) => {
        return (
          !( path[ path.length - 1] === 'selected' && ( path[1] === 'layers' && path[2] === oldSceneData.selectedLayer )) &&
          !(op === 'remove' && path.indexOf(oldSceneData.selectedLayer) !== -1)
        );
      });
    }
  }

  return diffArray;
}

// If an element was just selected, ignore its property diffs (selection already triggers rebuild)
function minimizeChangePropertiesAfterSelectionsDiffs(diffArray, sceneData, oldSceneData) {
  let idsFound = {};
  diffArray.forEach( ({path}) => {
    if (path[5] === 'selected') {
      idsFound[path[4]] = path[4];
    }
  });

  return diffArray.filter( ({path}) => {
    if (path[5] === 'properties') {
      return idsFound[path[4]] ? false : true;
    }
    return true;
  });
}

// Deduplicate property diffs and drop misc changes
function minimizeChangePropertiesDiffs(diffArray, sceneData, oldSceneData) {
  let idsFound = {};
  return diffArray.filter( ({path}) => {
    if (path[5] === 'properties') {
      return idsFound[path[4]] ? false : (idsFound[path[4]] = true);
    } else if (path[5] === 'misc') {
      return false;
    }
    return true;
  });
}
