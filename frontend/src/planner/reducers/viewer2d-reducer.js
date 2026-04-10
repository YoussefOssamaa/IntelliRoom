import {
  UPDATE_2D_CAMERA,
  SELECT_TOOL_PAN,
  SELECT_TOOL_ZOOM_IN,
  SELECT_TOOL_ZOOM_OUT,
  INITIALIZE_VIEWER_2D,
  MODE_2D_PAN,
  MODE_2D_ZOOM_IN,
  MODE_2D_ZOOM_OUT
} from '../constants';
import { Map } from 'immutable';

export default function (state, action) {
  switch (action.type) {
    case UPDATE_2D_CAMERA:
      return state.merge({viewer2D: action.value});

    case INITIALIZE_VIEWER_2D:
      const { sceneWidth, sceneHeight } = action;
      const initialValue = new Map({
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: sceneWidth / 2,
        f: sceneHeight / 2,
        SVGMinX: 0,
        SVGMinY: 0,
        SVGWidth: sceneWidth,
        SVGHeight: sceneHeight,
        version: 2,
        miniatureOpen: false,
        focus: false
      });
      return state.set('viewer2D', initialValue);

    case SELECT_TOOL_PAN:
      return state.set('mode', MODE_2D_PAN);

    case SELECT_TOOL_ZOOM_IN:
      return state.set('mode', MODE_2D_ZOOM_IN);

    case SELECT_TOOL_ZOOM_OUT:
      return state.set('mode', MODE_2D_ZOOM_OUT);
  }
}
