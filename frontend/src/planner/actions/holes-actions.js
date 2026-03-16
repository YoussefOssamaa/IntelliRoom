import {
  SELECT_HOLE,
  SELECT_TOOL_DRAWING_HOLE,
  UPDATE_DRAWING_HOLE,
  END_DRAWING_HOLE,
  SELECT_TOOL_DRAWING_HOLE_3D,
  UPDATE_DRAWING_HOLE_3D,
  END_DRAWING_HOLE_3D,
  BEGIN_DRAGGING_HOLE,
  UPDATE_DRAGGING_HOLE,
  END_DRAGGING_HOLE,
  BEGIN_DRAGGING_HOLE_3D,
  UPDATE_DRAGGING_HOLE_3D,
  END_DRAGGING_HOLE_3D
} from '../constants';

export function selectHole(layerID, holeID) {
  return {
    type: SELECT_HOLE,
    layerID,
    holeID
  }
}

export function selectToolDrawingHole(sceneComponentType) {
  return {
    type: SELECT_TOOL_DRAWING_HOLE,
    sceneComponentType
  }
}

export function updateDrawingHole(layerID, x, y) {
  return {
    type: UPDATE_DRAWING_HOLE,
    layerID, x, y
  }
}

export function endDrawingHole(layerID, x, y) {
  return {
    type: END_DRAWING_HOLE,
    layerID, x, y
  }
}

// 3D hole drawing actions
export function selectToolDrawingHole3D(sceneComponentType) {
  return {
    type: SELECT_TOOL_DRAWING_HOLE_3D,
    sceneComponentType
  }
}

export function updateDrawingHole3D(layerID, x, y, z, lineID, offset) {
  return {
    type: UPDATE_DRAWING_HOLE_3D,
    layerID, x, y, z, lineID, offset
  }
}

export function endDrawingHole3D(layerID, x, y, z, lineID, offset) {
  return {
    type: END_DRAWING_HOLE_3D,
    layerID, x, y, z, lineID, offset
  }
}

// 2D hole dragging actions
export function beginDraggingHole(layerID, holeID, x, y) {
  return {
    type: BEGIN_DRAGGING_HOLE,
    layerID, holeID, x, y
  };
}

export function updateDraggingHole(x, y) {
  return {
    type: UPDATE_DRAGGING_HOLE,
    x, y
  }
}

export function endDraggingHole(x, y) {
  return {
    type: END_DRAGGING_HOLE,
    x, y
  }
}

// 3D hole dragging actions
export function beginDraggingHole3D(layerID, holeID, x, y, z) {
  return {
    type: BEGIN_DRAGGING_HOLE_3D,
    layerID, holeID, x, y, z
  };
}

export function updateDraggingHole3D(x, y, z, lineID) {
  return {
    type: UPDATE_DRAGGING_HOLE_3D,
    x, y, z, lineID
  }
}

export function endDraggingHole3D(x, y, z) {
  return {
    type: END_DRAGGING_HOLE_3D,
    x, y, z
  }
}
