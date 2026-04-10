import { Map, List } from 'immutable';
import {
  MODE_VIEWING_CATALOG,
  MODE_CONFIGURING_PROJECT,
  MODE_IDLE,
  MODE_3D_VIEW,
  MODE_DRAWING_ITEM_3D,
  MODE_DRAGGING_ITEM_3D,
  MODE_DRAWING_HOLE_3D,
  MODE_DRAGGING_HOLE_3D,
  MODE_APPLYING_TEXTURE,
  MODE_3D_MEASURE,
  MODE_3D_FIRST_PERSON
} from '../constants';
import { State, Catalog } from '../models';
import { history } from '../utils/export';
import {
  Layer,
  Group,
  Line,
  Hole,
  Item,
  HorizontalGuide,
  VerticalGuide
} from '../class/export';

class Project{

  static preserveModeAfterHistoryAction(state) {
    const currentMode = state.get('mode');
    const _3D_MODES = [
      MODE_3D_VIEW,
      MODE_DRAWING_ITEM_3D,
      MODE_DRAGGING_ITEM_3D,
      MODE_DRAWING_HOLE_3D,
      MODE_DRAGGING_HOLE_3D,
      MODE_APPLYING_TEXTURE,
      MODE_3D_MEASURE,
      MODE_3D_FIRST_PERSON,
    ];

    if (_3D_MODES.indexOf(currentMode) !== -1) {
      return MODE_3D_VIEW;
    }

    return MODE_IDLE;
  }

  static setAlterate( state ){
    return { updatedState: state.set('alterate', !state.alterate ) };
  }

  static openCatalog( state ) {
    state = this.setMode( state, MODE_VIEWING_CATALOG ).updatedState;

    return { updatedState: state };
  }

  static newProject(state) {
    state = new State({ viewer2D: state.get('viewer2D'), catalog: state.catalog.toJS() });

    return { updatedState: state };
  }

  static loadProject(state, sceneJSON) {
    state = new State({ scene: sceneJSON, catalog: state.catalog.toJS() });

    return { updatedState: state };
  }

  static setProperties(state, layerID, properties) {
    state = Layer.setPropertiesOnSelected( state, layerID, properties ).updatedState;

    return { updatedState: state };
  }

  static updateProperties(state, layerID, properties) {
    state = Layer.updatePropertiesOnSelected( state, layerID, properties ).updatedState;

    return { updatedState: state };
  }

  static setItemsAttributes(state, attributes) {
    //TODO apply only to items
    state.getIn(['scene', 'layers']).forEach( layer => { state = Layer.setAttributesOnSelected( state, layer.id, attributes ).updatedState; } );

    return { updatedState: state };
  }

  static setLinesAttributes(state, attributes) {
    //TODO apply only to lines
    state.getIn(['scene', 'layers']).forEach( layer => { state = Layer.setAttributesOnSelected( state, layer.id, attributes ).updatedState; } );

    return { updatedState: state };
  }

  static setHolesAttributes(state, attributes) {
    //TODO apply only to holes
    state.getIn(['scene', 'layers']).forEach( layer => { state = Layer.setAttributesOnSelected( state, layer.id, attributes ).updatedState; } );

    return { updatedState: state };
  }

  static unselectAll(state) {
    state.getIn(['scene', 'layers']).forEach( ({ id: layerID }) => { state = Layer.unselectAll( state, layerID ).updatedState; });
    state.getIn(['scene', 'groups']).forEach( group => { state = Group.unselect( state, group.get('id') ).updatedState; });

    return { updatedState: state };
  }

  static remove(state) {
    let selectedLayer = state.getIn(['scene', 'selectedLayer']);
    let {
      lines: selectedLines,
      holes: selectedHoles,
      items: selectedItems
    } = state.getIn(['scene', 'layers', selectedLayer, 'selected']);

    state = Layer.unselectAll( state, selectedLayer ).updatedState;

    selectedLines.forEach(lineID => { state = Line.remove( state, selectedLayer, lineID ).updatedState; });
    selectedHoles.forEach(holeID => { state = Hole.remove( state, selectedLayer, holeID ).updatedState; });
    selectedItems.forEach(itemID => { state = Item.remove( state, selectedLayer, itemID ).updatedState; });

    state = Layer.detectAndUpdateAreas( state, selectedLayer ).updatedState;

    return { updatedState: state };
  }

  static undo(state) {
    let sceneHistory = state.sceneHistory;
    if (sceneHistory.list.size < 1) return { updatedState: state };

    // Save current scene for redo before undoing
    let redoStack = state.get('redoStack') || new List();
    redoStack = redoStack.push(state.scene);

    // historyPop returns the scene prior to the most recent push.
    // We only pop once — the previous conditional double-pop caused undo to
    // skip two history entries when state.scene matched sceneHistory.last
    // (e.g. after a rollback), producing scenes with missing area IDs that
    // then crashed scene-creator when the diff tried to reference them.
    let poppedHistory = history.historyPop(sceneHistory);

    state = state.merge({
      mode: this.preserveModeAfterHistoryAction(state),
      scene: poppedHistory.last,
      sceneHistory: poppedHistory,
      redoStack
    });

    return { updatedState: state };
  }

  static redo(state) {
    let redoStack = state.get('redoStack') || new List();
    if (redoStack.size === 0) return { updatedState: state };

    let sceneToRestore = redoStack.last();
    redoStack = redoStack.pop();

    // Push the current scene into undo history before restoring
    state = state.merge({
      mode: this.preserveModeAfterHistoryAction(state),
      scene: sceneToRestore,
      sceneHistory: history.historyPush(state.sceneHistory, sceneToRestore),
      redoStack
    });

    return { updatedState: state };
  }

  static rollback(state) {
    let sceneHistory = state.sceneHistory;

    if (!sceneHistory.last && sceneHistory.list.isEmpty()) {
      return { updatedState: state };
    }

    state = this.unselectAll( state ).updatedState;

    state = state.merge({
      mode: MODE_IDLE,
      scene: sceneHistory.last,
      sceneHistory: history.historyPush(sceneHistory, sceneHistory.last),
      snapElements: new List(),
      activeSnapElement: null,
      drawingSupport: new Map(),
      draggingSupport: new Map(),
      rotatingSupport: new Map(),
    });

    return { updatedState: state };
  }

  static setProjectProperties(state, properties) {
    let scene = state.scene.merge(properties);
    state = state.merge({
      mode: MODE_IDLE,
      scene
    });

    return { updatedState: state };
  }

  static openProjectConfigurator(state) {
    state = state.merge({
      mode: MODE_CONFIGURING_PROJECT,
    });

    return { updatedState: state };
  }

  static initCatalog(state, catalog) {
    state = state.set('catalog', new Catalog(catalog));

    return { updatedState: state };
  }

  static updateMouseCoord(state, coords) {
    state = state.set('mouse', new Map(coords));

    return { updatedState: state };
  }

  static updateZoomScale(state, scale) {
    state = state.set('zoom', scale);

    return { updatedState: state };
  }

  static updateViewCenter(state, viewCenter) {
    state = state.set('viewCenter', new Map(viewCenter));

    return { updatedState: state };
  }

  static toggleSnap(state, mask) {
    state = state.set('snapMask', mask);
    return { updatedState: state };
  }

  static throwError(state, error) {
    state = state.set('errors', state.get('errors').push({
      date: Date.now(),
      error
    }));

    return { updatedState: state };
  }

  static throwWarning(state, warning) {
    state = state.set('warnings', state.get('warnings').push({
      date: Date.now(),
      warning
    }));

    return { updatedState: state };
  }

  static copyProperties(state, properties){
    state = state.set('clipboardProperties', properties);

    return { updatedState: state };
  }

  static pasteProperties(state) {
    state = this.updateProperties(state, state.getIn(['scene', 'selectedLayer']), state.get('clipboardProperties')).updatedState;

    return { updatedState: state };
  }

  static pushLastSelectedCatalogElementToHistory(state, element) {
    let currHistory = state.selectedElementsHistory;

    let previousPosition = currHistory.findIndex(el => el.name === element.name);
    if (previousPosition !== -1) {
      currHistory = currHistory.splice(previousPosition, 1);
    }
    currHistory = currHistory.splice(0, 0, element);

    state = state.set('selectedElementsHistory', currHistory);
    return { updatedState: state };
  }

  static changeCatalogPage( state, oldPage, newPage ) {
    state = state.setIn(['catalog', 'page'], newPage)
      .updateIn(['catalog', 'path'], path => path.push(oldPage));

    return { updatedState: state };
  }

  static goBackToCatalogPage( state, newPage ){
    let pageIndex = state.catalog.path.findIndex(page => page === newPage);
    state =  state.setIn(['catalog', 'page'], newPage)
      .updateIn(['catalog', 'path'], path => path.take(pageIndex));

    return { updatedState: state };
  }

  static setMode( state, mode ){
    state = state.set('mode', mode);
    return { updatedState: state };
  }

  static addHorizontalGuide( state, coordinate ){
    state = HorizontalGuide.create( state, coordinate ).updatedState;

    return { updatedState: state };
  }

  static addVerticalGuide( state, coordinate ){
    state = VerticalGuide.create( state, coordinate ).updatedState;

    return { updatedState: state };
  }

  static addCircularGuide( state, x, y, radius ){
    console.log('adding horizontal guide at', x, y, radius);

    return { updatedState: state };
  }

  static removeHorizontalGuide( state, guideID ){
    state = HorizontalGuide.remove( state, guideID ).updatedState;

    return { updatedState: state };
  }

  static removeVerticalGuide( state, guideID ){
    state = VerticalGuide.remove( state, guideID ).updatedState;

    return { updatedState: state };
  }

  static removeCircularGuide( state, guideID ){
    console.log('removeing horizontal guide ', guideID);

    return { updatedState: state };
  }

}

export { Project as default };
