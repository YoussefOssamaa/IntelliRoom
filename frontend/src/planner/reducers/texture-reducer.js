import { Map, fromJS } from 'immutable';
import { history } from '../utils/export';
import {
  SELECT_TEXTURE,
  APPLY_TEXTURE_TO_ELEMENT,
  CANCEL_TEXTURE_APPLICATION,
  MODE_APPLYING_TEXTURE,
  MODE_3D_VIEW
} from '../constants';

export default function (state, action) {

  switch (action.type) {
    case SELECT_TEXTURE: {
      // Store the selected texture info and switch to texture application mode
      state = state.set('mode', MODE_APPLYING_TEXTURE);
      state = state.set('textureApplication', new Map({
        textureKey: action.textureKey,
        targetType: action.targetType  // 'wall' or 'floor'
      }));
      return state;
    }

    case APPLY_TEXTURE_TO_ELEMENT: {
      const { layerID, elementID, elementPrototype, propertyName, textureKey } = action;
      
      // Push history for undo support
      state = state.merge({ sceneHistory: history.historyPush(state.sceneHistory, state.scene) });
      
      // Directly set the texture property on the specific element
      state = state.setIn(
        ['scene', 'layers', layerID, elementPrototype, elementID, 'properties', propertyName],
        textureKey
      );
      
      // Stay in texture application mode so user can keep applying
      return state;
    }

    case CANCEL_TEXTURE_APPLICATION: {
      // Return to 3D view mode and clear texture application state
      state = state.set('mode', MODE_3D_VIEW);
      state = state.delete('textureApplication');
      return state;
    }

    default:
      return state;
  }
}
