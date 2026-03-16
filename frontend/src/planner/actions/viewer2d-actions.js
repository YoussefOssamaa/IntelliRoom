import {UPDATE_2D_CAMERA, SELECT_TOOL_PAN, SELECT_TOOL_ZOOM_IN, SELECT_TOOL_ZOOM_OUT, INITIALIZE_VIEWER_2D} from '../constants';

export function updateCameraView(value) {
  return {
    type: UPDATE_2D_CAMERA,
    value
  }
}

export function initializeViewer2D(sceneWidth, sceneHeight) {
  return {
    type: INITIALIZE_VIEWER_2D,
    sceneWidth,
    sceneHeight
  }
}

export function selectToolPan() {
  return {
    type: SELECT_TOOL_PAN
  };
}

export function selectToolZoomOut() {
  return {
    type: SELECT_TOOL_ZOOM_OUT
  };
}

export function selectToolZoomIn() {
  return {
    type: SELECT_TOOL_ZOOM_IN
  };
}
