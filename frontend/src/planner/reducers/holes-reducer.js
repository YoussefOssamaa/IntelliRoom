import { List } from 'immutable';
import { Hole } from '../class/export';
import { history } from '../utils/export';
import {
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
  END_DRAGGING_HOLE_3D,
  SELECT_HOLE,
} from '../constants';

export default function (state, action) {
  switch (action.type) {
    case SELECT_TOOL_DRAWING_HOLE:
      // No history push here — recorded in END_DRAWING_HOLE.
      return Hole.selectToolDrawingHole(state, action.sceneComponentType).updatedState;

    case UPDATE_DRAWING_HOLE:
      return Hole.updateDrawingHole(state, action.layerID, action.x, action.y).updatedState;

    case END_DRAWING_HOLE: {
      console.log('[holes-reducer] END_DRAWING_HOLE action received | state.mode before:', state.get('mode'));
      let resultState = Hole.endDrawingHole(state, action.layerID, action.x, action.y).updatedState;
      console.log('[holes-reducer] END_DRAWING_HOLE | state.mode after:', resultState.get('mode'));
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      console.log('[holes-reducer] END_DRAWING_HOLE | final mode:', resultState.get('mode'));
      return resultState;
    }

    // 3D hole drawing
    case SELECT_TOOL_DRAWING_HOLE_3D:
      // No history push here — recorded in END_DRAWING_HOLE_3D.
      return Hole.selectToolDrawingHole3D(state, action.sceneComponentType).updatedState;

    case UPDATE_DRAWING_HOLE_3D:
      return Hole.updateDrawingHole3D(state, action.layerID, action.x, action.y, action.z, action.lineID, action.offset).updatedState;

    case END_DRAWING_HOLE_3D: {
      let resultState = Hole.endDrawingHole3D(state, action.layerID, action.x, action.y, action.z, action.lineID, action.offset).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    // 2D hole dragging
    case BEGIN_DRAGGING_HOLE:
      // No history push here — recorded in END_DRAGGING_HOLE.
      return Hole.beginDraggingHole(state, action.layerID, action.holeID, action.x, action.y).updatedState;

    case UPDATE_DRAGGING_HOLE:
      return Hole.updateDraggingHole(state, action.x, action.y).updatedState;

    case END_DRAGGING_HOLE: {
      let resultState = Hole.endDraggingHole(state, action.x, action.y).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    // 3D hole dragging
    case BEGIN_DRAGGING_HOLE_3D:
      // No history push here — recorded in END_DRAGGING_HOLE_3D.
      return Hole.beginDraggingHole3D(state, action.layerID, action.holeID, action.x, action.y, action.z).updatedState;

    case UPDATE_DRAGGING_HOLE_3D:
      return Hole.updateDraggingHole3D(state, action.x, action.y, action.z, action.lineID).updatedState;

    case END_DRAGGING_HOLE_3D: {
      let resultState = Hole.endDraggingHole3D(state, action.x, action.y, action.z).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    case SELECT_HOLE:
      return Hole.select( state, action.layerID, action.holeID ).updatedState;

    default:
      return state;
  }
}
