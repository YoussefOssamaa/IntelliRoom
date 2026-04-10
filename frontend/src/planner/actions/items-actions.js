import {
  SELECT_ITEM,
  SELECT_TOOL_DRAWING_ITEM,
  UPDATE_DRAWING_ITEM,
  END_DRAWING_ITEM,
  SELECT_TOOL_DRAWING_ITEM_3D,
  UPDATE_DRAWING_ITEM_3D,
  END_DRAWING_ITEM_3D,
  BEGIN_DRAGGING_ITEM,
  UPDATE_DRAGGING_ITEM,
  END_DRAGGING_ITEM,
  BEGIN_DRAGGING_ITEM_3D,
  UPDATE_DRAGGING_ITEM_3D,
  END_DRAGGING_ITEM_3D,
  BEGIN_ROTATING_ITEM,
  UPDATE_ROTATING_ITEM,
  END_ROTATING_ITEM
} from '../constants';

export function selectItem(layerID, itemID) {
  return {
    type: SELECT_ITEM,
    layerID,
    itemID
  }
}

export function selectToolDrawingItem(sceneComponentType) {
  return {
    type: SELECT_TOOL_DRAWING_ITEM,
    sceneComponentType
  }
}

export function updateDrawingItem(layerID, x, y) {
  return {
    type: UPDATE_DRAWING_ITEM,
    layerID, x, y
  }
}

export function endDrawingItem(layerID, x, y) {
  return {
    type: END_DRAWING_ITEM,
    layerID, x, y
  }
}

export function beginDraggingItem(layerID, itemID, x, y) {
  return {
    type: BEGIN_DRAGGING_ITEM,
    layerID, itemID, x, y
  }
}

export function updateDraggingItem(x, y) {
  return {
    type: UPDATE_DRAGGING_ITEM,
    x, y
  }
}

export function endDraggingItem(x, y) {
  return {
    type: END_DRAGGING_ITEM,
    x, y
  }
}

export function beginRotatingItem(layerID, itemID, x, y) {
  return {
    type: BEGIN_ROTATING_ITEM,
    layerID, itemID, x, y
  }
}

export function updateRotatingItem(x, y) {
  return {
    type: UPDATE_ROTATING_ITEM,
    x, y
  }
}

export function endRotatingItem(x, y) {
  return {
    type: END_ROTATING_ITEM,
    x, y
  }
}

export function selectToolDrawingItem3D(sceneComponentType) {
  return {
    type: SELECT_TOOL_DRAWING_ITEM_3D,
    sceneComponentType
  }
}

export function updateDrawingItem3D(layerID, x, y, z) {
  return {
    type: UPDATE_DRAWING_ITEM_3D,
    layerID, x, y, z
  }
}

export function endDrawingItem3D(layerID, x, y, z) {
  return {
    type: END_DRAWING_ITEM_3D,
    layerID, x, y, z
  }
}

export function beginDraggingItem3D(layerID, itemID, x, y, z) {
  return {
    type: BEGIN_DRAGGING_ITEM_3D,
    layerID, itemID, x, y, z
  }
}

export function updateDraggingItem3D(x, y, z) {
  return {
    type: UPDATE_DRAGGING_ITEM_3D,
    x, y, z
  }
}

export function endDraggingItem3D(x, y, z) {
  return {
    type: END_DRAGGING_ITEM_3D,
    x, y, z
  }
}
