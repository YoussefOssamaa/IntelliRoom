import * as Three from 'three';
import createGrid from './grid-creator';

export function initializePlanData(sceneData, onBoundsUpdated = null) {
  const planData = {
    sceneGraph: {
      unit: sceneData.unit,
      layers: {},
      busyResources: { layers: {} },
      width: sceneData.width,
      height: sceneData.height,
      LODs: {},
    },
    _onBoundingBoxUpdated:
      typeof onBoundsUpdated === 'function' ? onBoundsUpdated : null,
  };

  planData.plan = new Three.Object3D();
  planData.plan.name = 'plan';

  planData.grid = createGrid(sceneData);
  planData.grid.name = 'grid';

  const planeWidth = sceneData.width * 3;
  const planeHeight = sceneData.height * 3;
  planData.raycastPlane = new Three.Mesh(
    new Three.PlaneGeometry(planeWidth, planeHeight),
    new Three.MeshBasicMaterial({ visible: false, side: Three.DoubleSide }),
  );
  planData.raycastPlane.rotation.x = -Math.PI / 2;
  planData.raycastPlane.position.set(
    sceneData.width / 2,
    0,
    -sceneData.height / 2,
  );
  planData.raycastPlane.name = 'raycastPlane';

  planData.boundingBoxCenter = new Three.Vector3(0, 0, 0);
  planData.boundingBoxHasGeometry = false;
  planData.boundingBox = {
    min: new Three.Vector3(0, 0, 0),
    max: new Three.Vector3(0, 0, 0),
  };

  return planData;
}

export function ensureLayerSceneGraph(planData, layer) {
  if (!planData.sceneGraph.layers[layer.id]) {
    planData.sceneGraph.layers[layer.id] = {
      id: layer.id,
      lines: {},
      holes: {},
      areas: {},
      items: {},
      visible: layer.visible,
      altitude: layer.altitude,
    };
  }

  if (!planData.sceneGraph.busyResources.layers[layer.id]) {
    planData.sceneGraph.busyResources.layers[layer.id] = {
      id: layer.id,
      lines: {},
      holes: {},
      areas: {},
      items: {},
    };
  }

  return planData.sceneGraph.layers[layer.id];
}

export function createLayerBuildTasks({
  layer,
  planData,
  sceneData,
  actions,
  catalog,
  addLine,
  addHole,
  addArea,
  addItem,
}) {
  ensureLayerSceneGraph(planData, layer);

  const staticPromises = [];
  const itemPromises = [];

  layer.lines.forEach((line) => {
    staticPromises.push(
      addLine(sceneData, planData, layer, line.id, catalog, actions.linesActions),
    );
    line.holes.forEach((holeID) => {
      staticPromises.push(
        addHole(sceneData, planData, layer, holeID, catalog, actions.holesActions),
      );
    });
  });

  layer.areas.forEach((area) => {
    staticPromises.push(
      addArea(sceneData, planData, layer, area.id, catalog, actions.areaActions),
    );
  });

  layer.items.forEach((item) => {
    itemPromises.push(
      addItem(sceneData, planData, layer, item.id, catalog, actions.itemsActions),
    );
  });

  return {
    staticPromises,
    itemPromises,
    promises: [...staticPromises, ...itemPromises],
  };
}
