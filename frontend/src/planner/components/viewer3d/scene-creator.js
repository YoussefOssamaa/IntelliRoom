import * as Three from 'three';
import createGrid from './grid-creator';
import { disposeObject } from './three-memory-cleaner';
import { wallVisibilityManager } from './wall-visibility-manager';

export function parseData(sceneData, actions, catalog, onBoundingBoxReady) {

  let planData = {};

  planData.sceneGraph = {
    unit: sceneData.unit,
    layers: {},
    busyResources: { layers: {} },
    width: sceneData.width,
    height: sceneData.height,
    LODs: {}
  };

  planData.plan = new Three.Object3D();
  planData.plan.name = 'plan';

  // Add a grid to the plan
  planData.grid = createGrid(sceneData);
  planData.grid.name = 'grid';

  // Invisible plane for stable raycasting (LineSegments grid gives jittery hits)
  const _planeW = sceneData.width  * 3;
  const _planeH = sceneData.height * 3;
  planData.raycastPlane = new Three.Mesh(
    new Three.PlaneGeometry(_planeW, _planeH),
    new Three.MeshBasicMaterial({ visible: false, side: Three.DoubleSide })
  );
  planData.raycastPlane.rotation.x = -Math.PI / 2;
  planData.raycastPlane.position.set(sceneData.width / 2, 0, -sceneData.height / 2);
  planData.raycastPlane.name = 'raycastPlane';

  planData.boundingBoxCenter = new Three.Vector3(0,0,0);
  planData.boundingBoxHasGeometry = false;
  planData.boundingBox = {
    min: new Three.Vector3(0, 0, 0),
    max: new Three.Vector3(0, 0, 0)
  };

  let promises = [];

  sceneData.layers.forEach(layer => {

    if (layer.id === sceneData.selectedLayer || layer.visible) {
      promises = promises.concat(createLayerObjects(layer, planData, sceneData, actions, catalog));
    }
  });

  Promise.all(promises).then(value => updateBoundingBox(planData, onBoundingBoxReady));

  return planData;
}

function createLayerObjects(layer, planData, sceneData, actions, catalog) {

  let promises = [];

  planData.sceneGraph.layers[layer.id] = {
    id: layer.id,
    lines: {},
    holes: {},
    areas: {},
    items: {},
    visible: layer.visible,
    altitude: layer.altitude
  };

  planData.sceneGraph.busyResources.layers[layer.id] = {
    id: layer.id,
    lines: {},
    holes: {},
    areas: {},
    items: {}
  };

  // Import lines
  layer.lines.forEach(line => {
    promises.push(addLine(sceneData, planData, layer, line.id, catalog, actions.linesActions));
    line.holes.forEach(holeID => {
      promises.push(addHole(sceneData, planData, layer, holeID, catalog, actions.holesActions));
    });
  });

  // Import areas
  layer.areas.forEach(area => {
    promises.push(addArea(sceneData, planData, layer, area.id, catalog, actions.areaActions));
  });

  // Import items
  layer.items.forEach(item => {
    promises.push(addItem(sceneData, planData, layer, item.id, catalog, actions.itemsActions));
  });

  return promises;
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
        let promises = createLayerObjects(layerSelected, planData, sceneData, actions, catalog);
        Promise.all(promises).then(() => updateBoundingBox(planData));
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
      let item = layer.getIn(['items', modifiedPath[4]]);

      // Fast path: position/rotation changes update the mesh directly (no flicker)
      if (modifiedPath.length >= 6 &&
          (modifiedPath[5] === 'x' || modifiedPath[5] === 'y' || modifiedPath[5] === 'rotation')) {
        let existingMesh = planData.sceneGraph.layers[layer.id] &&
                           planData.sceneGraph.layers[layer.id].items &&
                           planData.sceneGraph.layers[layer.id].items[modifiedPath[4]];
        if (existingMesh) {
          existingMesh.position.x = item.x;
          existingMesh.position.z = -item.y;
          existingMesh.rotation.y = item.rotation * Math.PI / 180;
          break;
        }
      }

      if (catalog.getElement(item.type).updateRender3D) {
        promises.push(
          updateItem(
            sceneData,
            oldSceneData,
            planData,
            layer,
            modifiedPath[4],
            modifiedPath.slice(5),
            catalog,
            actions.itemsActions,
            () => removeItem(planData, layer.id, modifiedPath[4]),
            () => addItem(sceneData, planData, layer, modifiedPath[4], catalog, actions.itemsActions)
          )
        );
      }
      else {
        removeItem(planData, layer.id, modifiedPath[4]);
        promises.push(addItem(sceneData, planData, layer, modifiedPath[4], catalog, actions.itemsActions));
      }
      break;

    case 'visible':
      if (!layer.visible) {
        let layerGraph = planData.sceneGraph.layers[layer.id];

        for (let lineID in layerGraph.lines) removeLine(planData, layer.id, lineID);
        for (let areaID in layerGraph.areas) removeArea(planData, layer.id, areaID);
        for (let itemID in layerGraph.items) removeItem(planData, layer.id, itemID);
        for (let holeID in layerGraph.holes) removeHole(planData, layer.id, holeID);

      } else {
        promises = promises.concat(createLayerObjects(layer, planData, sceneData, actions, catalog));
      }

      break;

    case 'opacity':
    case 'altitude':
      let layerGraph = planData.sceneGraph.layers[layer.id];
      for (let lineID in layerGraph.lines) removeLine(planData, layer.id, lineID);
      for (let areaID in layerGraph.areas) removeArea(planData, layer.id, areaID);
      for (let itemID in layerGraph.items) removeItem(planData, layer.id, itemID);
      for (let holeID in layerGraph.holes) removeHole(planData, layer.id, holeID);

      promises = promises.concat(createLayerObjects(layer, planData, sceneData, actions, catalog));

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

  let item3D = planData.sceneGraph.layers[layerId].items[itemID];

  if (item3D) {
    planData.plan.remove(item3D);
    disposeObject(item3D);
    delete planData.sceneGraph.layers[layerId].items[itemID];
    delete planData.sceneGraph.LODs[itemID];
    item3D = null;
    updateBoundingBox(planData);
  }

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

    if( addPromise ) addPromise( sceneData, planData, layer, modifiedPath[4], catalog, addAction ).then(() => updateBoundingBox(planData));
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
  const busy = planData.sceneGraph.busyResources.layers[layer.id].items[itemID];
  if (busy) {
    setTimeout(() => addItem(sceneData, planData, layer, itemID, catalog, itemsActions), 100);
    return Promise.resolve();
  }

  planData.sceneGraph.busyResources.layers[layer.id].items[itemID] = true;

  let item = layer.getIn(['items', itemID]);

  if (!item || !item.type) {
    planData.sceneGraph.busyResources.layers[layer.id].items[itemID] = false;
    return Promise.resolve();
  }

  return catalog.getElement(item.type).render3D(item, layer, sceneData).then(item3D => {

    if (item3D instanceof Three.LOD) {
      planData.sceneGraph.LODs[itemID] = item3D;
    }

    // Remove BoxHelpers from catalog (we manage selection boxes at scene level)
    const catalogBoxes = [];
    item3D.traverse(child => {
      if (child instanceof Three.BoxHelper) catalogBoxes.push(child);
    });
    catalogBoxes.forEach(b => {
      if (b.parent) b.parent.remove(b);
      if (b.geometry) b.geometry.dispose();
      if (b.material) b.material.dispose();
    });

    const catalogElement = catalog.getElement(item.type);
    const displayName = String(catalogElement?.info?.title || item.type || 'item').trim();

    let pivot = new Three.Object3D();
    pivot.name = 'pivot';
    pivot.add(item3D);
    pivot.userData = {
      elementType: 'items',
      elementID: itemID,
      layerID: layer.id,
      catalogType: item.type,
      displayName,
    };

    // Find floor slab height (same approach as holes/walls) so altitude=0 means top-of-slab
    let itemSlabHeight = 20;
    try {
      layer.areas.forEach(area => {
        if (area && area.get('properties')) {
          const areaFloorThickness = area.getIn(['properties', 'floorThickness', 'length']);
          if (areaFloorThickness) {
            itemSlabHeight = areaFloorThickness;
            return false; // break
          }
        }
      });
    } catch (e) { /* use default */ }

    pivot.rotation.y = item.rotation * Math.PI / 180;
    pivot.position.x = item.x;
    pivot.position.y = layer.altitude + itemSlabHeight;
    pivot.position.z = -item.y;

    applyInteract(item3D, () => {
      itemsActions.selectItem(layer.id, item.id);
    }
    );

    let opacity = layer.opacity;
    if (item.selected) {
      opacity = 1;
    }

    applyOpacity(pivot, opacity);

    const existingPivot = planData.sceneGraph.layers[layer.id].items[itemID];
    if (existingPivot && existingPivot !== pivot) {
      planData.plan.remove(existingPivot);
      disposeObject(existingPivot);
    }

    planData.plan.add(pivot);
    planData.sceneGraph.layers[layer.id].items[itemID] = pivot;
    planData.sceneGraph.busyResources.layers[layer.id].items[itemID] = false;
    updateBoundingBox(planData);
  }).catch(() => {
    planData.sceneGraph.busyResources.layers[layer.id].items[itemID] = false;
  });

}

function updateItem(sceneData, oldSceneData, planData, layer, itemID, differences, catalog, itemsActions, selfDestroy, selfBuild) {
  let item = layer.getIn(['items', itemID]);
  let oldItem = oldSceneData.getIn(['layers', layer.id, 'items', itemID]);
  let mesh = planData.sceneGraph.layers[layer.id].items[itemID];

  if (!mesh) return null;

  return catalog.getElement(item.type).updateRender3D(item, layer, sceneData, mesh, oldItem, differences, selfDestroy, selfBuild);
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


function updateBoundingBox(planData, onFirstUpdate) {
  // Calculate bounding box from element coordinates
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  let hasElements = false;

  // Iterate through all layers and their elements
  for (let layerId in planData.sceneGraph.layers) {
    let layer = planData.sceneGraph.layers[layerId];

    // Process lines
    for (let lineId in layer.lines) {
      let lineObj = layer.lines[lineId];
      if (lineObj && lineObj.position) {
        hasElements = true;
        let box = new Three.Box3().setFromObject(lineObj);
        if (isFinite(box.min.x)) {
          minX = Math.min(minX, box.min.x);
          minY = Math.min(minY, box.min.y);
          minZ = Math.min(minZ, box.min.z);
          maxX = Math.max(maxX, box.max.x);
          maxY = Math.max(maxY, box.max.y);
          maxZ = Math.max(maxZ, box.max.z);
        }
      }
    }

    // Process items
    for (let itemId in layer.items) {
      let itemObj = layer.items[itemId];
      if (itemObj && itemObj.position) {
        hasElements = true;
        let box = new Three.Box3().setFromObject(itemObj);
        if (isFinite(box.min.x)) {
          minX = Math.min(minX, box.min.x);
          minY = Math.min(minY, box.min.y);
          minZ = Math.min(minZ, box.min.z);
          maxX = Math.max(maxX, box.max.x);
          maxY = Math.max(maxY, box.max.y);
          maxZ = Math.max(maxZ, box.max.z);
        }
      }
    }
  }

  // Empty scene fallback: use floor-plan dimensions so camera isn't at NaN
  if (!hasElements) {
    const w = planData.sceneGraph.width  || 12000;
    const h = planData.sceneGraph.height || 12000;
    minX = 0;   maxX = w;
    minY = 0;   maxY = 0;
    minZ = -h;  maxZ = 0;
  }

  const newCenter = new Three.Vector3(
    (maxX - minX) / 2 + minX,
    (maxY - minY) / 2 + minY,
    (maxZ - minZ) / 2 + minZ
  );
  planData.boundingBoxCenter = newCenter;
  planData.boundingBoxCenter.lenX = maxX - minX;
  planData.boundingBoxCenter.lenZ = maxZ - minZ;
  planData.boundingBoxHasGeometry = hasElements;

  // Always set boundingBox so downstream code can rely on it even for empty scenes.
  planData.boundingBox = {
    min: new Three.Vector3(minX, minY, minZ),
    max: new Three.Vector3(maxX, maxY, maxZ)
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
