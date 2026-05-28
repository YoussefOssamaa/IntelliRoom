import Layer from './layer';
import Group from './group';
import {
  IDBroker,
  NameGenerator
} from '../utils/export';
import { Map, List, fromJS } from 'immutable';
import * as SnapUtils from '../utils/snap';
import * as SnapSceneUtils from '../utils/snap-scene';

import {
  MODE_IDLE,
  MODE_DRAWING_ITEM,
  MODE_DRAGGING_ITEM,
  MODE_DRAGGING_ITEM_3D,
  MODE_ROTATING_ITEM,
  MODE_3D_VIEW
} from '../constants';

const toRadians = (degrees) => degrees * Math.PI / 180;

const getItemBoundingBoxSize = (item) => ({
  width: Number(item?.properties?.getIn?.(['width', 'length']) || 200),
  depth: Number(item?.properties?.getIn?.(['depth', 'length']) || 100),
});

const getBoundingBoxAnchors = (x, y, width, depth, rotation = 0) => {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const rotationRadians = toRadians(rotation);
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);

  const rotatePoint = (localX, localY) => ({
    x: x + localX * cosine - localY * sine,
    y: y + localX * sine + localY * cosine,
  });

  return [
    { role: 'center', ...rotatePoint(0, 0) },
    { role: 'top-left', ...rotatePoint(-halfWidth, -halfDepth) },
    { role: 'top-right', ...rotatePoint(halfWidth, -halfDepth) },
    { role: 'bottom-right', ...rotatePoint(halfWidth, halfDepth) },
    { role: 'bottom-left', ...rotatePoint(-halfWidth, halfDepth) },
    { role: 'top', ...rotatePoint(0, -halfDepth) },
    { role: 'right', ...rotatePoint(halfWidth, 0) },
    { role: 'bottom', ...rotatePoint(0, halfDepth) },
    { role: 'left', ...rotatePoint(-halfWidth, 0) },
  ];
};

const applyBoundingBoxSnap = (state, item, x, y) => {
  const snapElements = state.get('snapElements');
  if (!state.snapMask || state.snapMask.isEmpty() || !snapElements?.size) {
    return { x, y, activeSnapElement: null };
  }

  const { width, depth } = getItemBoundingBoxSize(item);
  const rotation = Number(item?.rotation || 0);
  const anchors = getBoundingBoxAnchors(x, y, width, depth, rotation);

  let bestSnap = null;
  let deltaX = 0;
  let deltaY = 0;

  anchors.forEach((anchor) => {
    const snap = SnapUtils.nearestSnap(
      snapElements,
      anchor.x,
      anchor.y,
      state.snapMask,
    );

    if (!snap) return;

    if (!bestSnap || snap.point.distance < bestSnap.point.distance) {
      bestSnap = snap;
      deltaX = snap.point.x - anchor.x;
      deltaY = snap.point.y - anchor.y;
    }
  });

  return {
    x: x + deltaX,
    y: y + deltaY,
    activeSnapElement: bestSnap ? bestSnap.snap : null,
  };
};

const extractPersistedItemData = (drawingSupport) => {
  const rawItemData =
    drawingSupport && typeof drawingSupport.get === 'function'
      ? drawingSupport.get('itemData')
      : null;

  if (!rawItemData || typeof rawItemData.toJS !== 'function') {
    return {};
  }

  return rawItemData.toJS();
};

class Item{

  static create( state, layerID, type, x, y, width, height, rotation, itemData = {} ) {
    let itemID = IDBroker.acquireID();

    let item = state.catalog.factoryElement(type, {
      id: itemID,
      name: NameGenerator.generateName('items', state.catalog.getIn(['elements', type, 'info', 'title'])),
      type,
      height,
      width,
      x,
      y,
      rotation
    });

    if (item && typeof item.merge === 'function' && itemData && Object.keys(itemData).length > 0) {
      item = item.merge(itemData);
    }

    state = state.setIn(['scene', 'layers', layerID, 'items', itemID], item);

    return { updatedState: state, item };
  }

  static select( state, layerID, itemID ){
    state = Layer.select( state, layerID ).updatedState;
    state = Layer.selectElement( state, layerID, 'items', itemID ).updatedState;

    return {updatedState: state};
  }

  static remove( state, layerID, itemID ) {
    state = this.unselect( state, layerID, itemID ).updatedState;
    state = Layer.removeElement( state, layerID, 'items', itemID ).updatedState;

    state.getIn(['scene', 'groups']).forEach( group => state = Group.removeElement(state, group.id, layerID, 'items', itemID).updatedState );

    return { updatedState: state };
  }

  static unselect( state, layerID, itemID ) {
    state = Layer.unselect( state, layerID, 'items', itemID ).updatedState;

    return { updatedState: state };
  }

  static selectToolDrawingItem(state, sceneComponentType, itemData = null) {
    let snapElements = SnapSceneUtils.sceneSnapElements(
      state.scene,
      new List(),
      state.snapMask,
    );

    state = state.merge({
      mode: MODE_DRAWING_ITEM,
      snapElements,
      activeSnapElement: null,
      drawingSupport: new Map({
        type: sceneComponentType,
        itemData: itemData ? fromJS(itemData) : new Map(),
      })
    });

    return { updatedState: state };
  }

  static updateDrawingItem(state, layerID, x, y) {
    let activeSnapElement = null;

    if (state.hasIn(['drawingSupport','currentID'])) {
      const currentID = state.getIn(['drawingSupport','currentID']);
      const currentItem = state.getIn(['scene', 'layers', layerID, 'items', currentID]);
      ({ x, y, activeSnapElement } = applyBoundingBoxSnap(state, currentItem, x, y));
      state = state.updateIn(
        ['scene', 'layers', layerID, 'items', currentID],
        item => item.merge({x, y})
      );
    }
    else {
      let { updatedState: stateI, item } = this.create(
        state,
        layerID,
        state.getIn(['drawingSupport','type']),
        x,
        y,
        200,
        100,
        0,
        extractPersistedItemData(state.get('drawingSupport')),
      );
      ({ x, y, activeSnapElement } = applyBoundingBoxSnap(stateI, item, x, y));
      stateI = stateI.updateIn(
        ['scene', 'layers', layerID, 'items', item.id],
        currentItem => currentItem.merge({x, y})
      );
      state = Item.select( stateI, layerID, item.id ).updatedState;
      state = state.setIn(['drawingSupport','currentID'], item.id);
    }

    state = state.set('activeSnapElement', activeSnapElement);
    return { updatedState: state };
  }

  static endDrawingItem(state, layerID, x, y) {
    let catalog = state.catalog;
    state = this.updateDrawingItem(state, layerID, x, y, catalog).updatedState;
    state = Layer.unselectAll( state, layerID ).updatedState;
    state =  state.merge({
      activeSnapElement: null,
      drawingSupport: Map({
        type: state.drawingSupport.get('type'),
        itemData: state.drawingSupport.get('itemData') || new Map(),
      })
    });

    return { updatedState: state };
  }

  static beginDraggingItem(state, layerID, itemID, x, y) {

    let item = state.getIn(['scene', 'layers', layerID, 'items', itemID]);
    let snapElements = SnapSceneUtils.sceneSnapElements(state.scene, new List(), state.snapMask);

    state = state.merge({
      mode: MODE_DRAGGING_ITEM,
      snapElements,
      activeSnapElement: null,
      draggingSupport: Map({
        layerID,
        itemID,
        startPointX: x,
        startPointY: y,
        originalX: item.x,
        originalY: item.y
      })
    });

    return { updatedState: state };
  }

  static updateDraggingItem(state, x, y) {
    let {draggingSupport, scene} = state;

    let layerID = draggingSupport.get('layerID');
    let itemID = draggingSupport.get('itemID');
    let startPointX = draggingSupport.get('startPointX');
    let startPointY = draggingSupport.get('startPointY');
    let originalX = draggingSupport.get('originalX');
    let originalY = draggingSupport.get('originalY');

    let diffX = startPointX - x;
    let diffY = startPointY - y;

    let item = scene.getIn(['layers', layerID, 'items', itemID]);
    item = item.merge({
      x: originalX - diffX,
      y: originalY - diffY
    });

    let activeSnapElement = null;
    let snappedX = item.x;
    let snappedY = item.y;
    ({
      x: snappedX,
      y: snappedY,
      activeSnapElement,
    } = applyBoundingBoxSnap(state, item, item.x, item.y));

    item = item.merge({
      x: snappedX,
      y: snappedY,
    });

    state = state.merge({
      activeSnapElement,
      scene: scene.mergeIn(['layers', layerID, 'items', itemID], item)
    });

    return { updatedState: state };
  }

  static endDraggingItem(state, x, y) {
    state = this.updateDraggingItem(state, x, y).updatedState;
    state = state.merge({ mode: MODE_IDLE, activeSnapElement: null, snapElements: new List() });

    return { updatedState: state };
  }

  static beginRotatingItem(state, layerID, itemID, x, y) {
    state = state.merge({
      mode: MODE_ROTATING_ITEM,
      rotatingSupport: Map({
        layerID,
        itemID
      })
    });

    return { updatedState: state };
  }

  static updateRotatingItem(state, x, y) {
    let {rotatingSupport, scene} = state;

    let layerID = rotatingSupport.get('layerID');
    let itemID = rotatingSupport.get('itemID');
    let item = state.getIn(['scene', 'layers', layerID, 'items', itemID]);

    let deltaX = x - item.x;
    let deltaY = y - item.y;
    let rotation = Math.atan2(deltaY, deltaX) * 180 / Math.PI - 90;

    if (-5 < rotation && rotation < 5) rotation = 0;
    if (-95 < rotation && rotation < -85) rotation = -90;
    if (-185 < rotation && rotation < -175) rotation = -180;
    if (85 < rotation && rotation < 90) rotation = 90;
    if (-270 < rotation && rotation < -265) rotation = 90;

    item = item.merge({
      rotation,
    });

    state = state.merge({
      scene: scene.mergeIn(['layers', layerID, 'items', itemID], item)
    });

    return { updatedState: state };
  }

  static endRotatingItem(state, x, y) {
    state = this.updateRotatingItem(state, x, y).updatedState;
    state = state.merge({ mode: MODE_IDLE });

    return { updatedState: state };
  }

  // 3D Dragging methods
  static beginDraggingItem3D(state, layerID, itemID, x, y, z) {
    let item = state.getIn(['scene', 'layers', layerID, 'items', itemID]);

    console.group('%c[Redux] beginDraggingItem3D', 'color:#f80;font-weight:bold');
    console.log('  layerID:', layerID, '  itemID:', itemID);
    console.log('  passed x:', x, 'y:', y, 'z:', z);
    console.log('  item original x:', item.x, 'y:', item.y);
    console.groupEnd();

    state = state.merge({
      mode: MODE_DRAGGING_ITEM_3D,
      draggingSupport: Map({
        layerID,
        itemID,
        startPointX: x,
        startPointY: y,  // 2D plan Y (maps to 3D Z)
        startPointZ: z,  // 3D Y (height)
        originalX: item.x,
        originalY: item.y
      })
    });

    return { updatedState: state };
  }

  static updateDraggingItem3D(state, x, y, z) {
    let { draggingSupport, scene } = state;

    let layerID = draggingSupport.get('layerID');
    let itemID = draggingSupport.get('itemID');

    console.log('[Redux] updateDraggingItem3D  x:', x, 'y:', y,
      ' layerID:', layerID, ' itemID:', itemID);

    // Directly set position from 3D coordinates
    // x = 3D x position, y = 2D plan y (from -3D z)
    let item = scene.getIn(['layers', layerID, 'items', itemID]);
    item = item.merge({
      x: x,
      y: y  // This is the 2D plan Y coordinate
    });

    state = state.merge({
      scene: scene.mergeIn(['layers', layerID, 'items', itemID], item)
    });

    return { updatedState: state };
  }

  static endDraggingItem3D(state, x, y, z) {
    console.group('%c[Redux] endDraggingItem3D', 'color:#0af;font-weight:bold');
    console.log('  committing x:', x, 'y:', y);
    const ds = state.get('draggingSupport');
    if (ds) {
      console.log('  original item pos was x:', ds.get('originalX'), 'y:', ds.get('originalY'));
      if (Math.abs(x - ds.get('originalX')) < 1 && Math.abs(y - ds.get('originalY')) < 1) {
        console.warn('  ⚠ End position is nearly identical to START — this causes flickering-to-origin!');
      }
    }
    console.groupEnd();
    state = this.updateDraggingItem3D(state, x, y, z).updatedState;
    state = state.merge({ mode: MODE_3D_VIEW });
    return { updatedState: state };
  }

  static setProperties( state, layerID, itemID, properties ) {
    state = state.mergeIn(['scene', 'layers', layerID, 'items', itemID, 'properties'], properties);

    return { updatedState: state };
  }

  static setJsProperties( state, layerID, itemID, properties ) {
    return this.setProperties( state, layerID, itemID, fromJS(properties) );
  }

  static updateProperties( state, layerID, itemID, properties) {
    properties.forEach( ( v, k ) => {
      if( state.hasIn(['scene', 'layers', layerID, 'items', itemID, 'properties', k]) )
        state = state.mergeIn(['scene', 'layers', layerID, 'items', itemID, 'properties', k], v);
    });

    return { updatedState: state };
  }

  static updateJsProperties( state, layerID, itemID, properties) {
    return this.updateProperties( state, layerID, itemID, fromJS(properties) );
  }

  static setAttributes( state, layerID, itemID, itemAttributes) {
    state = state.mergeIn(['scene', 'layers', layerID, 'items', itemID], itemAttributes);
    return { updatedState: state };
  }

  static setJsAttributes( state, layerID, itemID, itemAttributes) {
    itemAttributes = fromJS(itemAttributes);
    return this.setAttributes(state, layerID, itemID, itemAttributes);
  }

}

export { Item as default };
