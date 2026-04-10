import { Map, List } from 'immutable';
import { Item } from '../class/export';
import { history } from '../utils/export';
import {
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
  END_ROTATING_ITEM,
  SELECT_ITEM,
  MODE_DRAWING_ITEM_3D
} from '../constants';

export default function (state, action) {
  switch (action.type) {
    case SELECT_ITEM:
      return Item.select(state, action.layerID, action.itemID).updatedState;

    case SELECT_TOOL_DRAWING_ITEM:
      // No history push here — recorded in END_DRAWING_ITEM after item is placed.
      return Item.selectToolDrawingItem(state, action.sceneComponentType).updatedState;

    case UPDATE_DRAWING_ITEM:
      return Item.updateDrawingItem(state, action.layerID, action.x, action.y).updatedState;

    case END_DRAWING_ITEM: {
      let resultState = Item.endDrawingItem(state, action.layerID, action.x, action.y).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    case SELECT_TOOL_DRAWING_ITEM_3D:
      // No history push here — recorded in END_DRAWING_ITEM_3D.
      state = state.merge({
        mode: MODE_DRAWING_ITEM_3D,
        drawingSupport: new Map({
          type: action.sceneComponentType
        })
      });
      return state;

    case UPDATE_DRAWING_ITEM_3D:
      return Item.updateDrawingItem(state, action.layerID, action.x, action.z).updatedState;

    case END_DRAWING_ITEM_3D: {
      let resultState = Item.endDrawingItem(state, action.layerID, action.x, action.z).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    case BEGIN_DRAGGING_ITEM:
      // No history push here — recorded in END_DRAGGING_ITEM.
      return Item.beginDraggingItem(state, action.layerID, action.itemID, action.x, action.y).updatedState;

    case UPDATE_DRAGGING_ITEM:
      return Item.updateDraggingItem(state, action.x, action.y).updatedState;

    case END_DRAGGING_ITEM: {
      let resultState = Item.endDraggingItem(state, action.x, action.y).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    case BEGIN_ROTATING_ITEM:
      // No history push here — recorded in END_ROTATING_ITEM.
      return Item.beginRotatingItem(state, action.layerID, action.itemID, action.x, action.y).updatedState;

    case UPDATE_ROTATING_ITEM:
      return Item.updateRotatingItem(state, action.x, action.y).updatedState;

    case END_ROTATING_ITEM: {
      let resultState = Item.endRotatingItem(state, action.x, action.y).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    case BEGIN_DRAGGING_ITEM_3D:
      // No history push here — recorded in END_DRAGGING_ITEM_3D.
      return Item.beginDraggingItem3D(state, action.layerID, action.itemID, action.x, action.y, action.z).updatedState;

    case UPDATE_DRAGGING_ITEM_3D:
      return Item.updateDraggingItem3D(state, action.x, action.y, action.z).updatedState;

    case END_DRAGGING_ITEM_3D: {
      let resultState = Item.endDraggingItem3D(state, action.x, action.y, action.z).updatedState;
      resultState = resultState.merge({
        sceneHistory: history.historyPush(state.sceneHistory, resultState.scene),
        redoStack: new List()
      });
      return resultState;
    }

    default:
      return state;
  }
}
