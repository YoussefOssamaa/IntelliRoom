import {Record, List, Map, fromJS} from 'immutable';
import {MODE_IDLE} from './constants';
import {SNAP_MASK} from './utils/snap';

let safeLoadMapList = (mapList, Model, defaultMap) => {
  return mapList
    ? new Map(mapList).map(m => new Model(m)).toMap()
    : (defaultMap || new Map());
};


export class Grid extends Record({
  id: '',              // e.g., 'h1', 'v1' - unique identifier for this grid
  type: '',            // e.g., 'horizontal-streak', 'vertical-streak' - grid pattern type
  properties: Map()    // e.g., { step: 20, colors: ['#808080', '#ddd', ...] } - grid visual settings
}, 'Grid') {
  constructor(json = {}) {
    super({
      ...json,
      properties: fromJS(json.properties || {})
    });
  }
}

export const DefaultGrids = new Map({
  'h1': new Grid({
    id: 'h1',
    type: 'horizontal-streak',
    properties: {
      step: 20,
      colors: ['#808080', '#ddd', '#ddd', '#ddd', '#ddd']
    }
  }),
  'v1': new Grid({
    id: 'v1',
    type: 'vertical-streak',
    properties: {
      step: 20,
      colors: ['#808080', '#ddd', '#ddd', '#ddd', '#ddd']
    }
  })
});


export class ElementsSet extends Record({
  vertices: new List(),  // e.g., ['vertex-1', 'vertex-2'] - IDs of selected vertices
  lines: new List(),     // e.g., ['line-1', 'line-3'] - IDs of selected walls
  holes: new List(),     // e.g., ['door-1'] - IDs of selected doors/windows
  areas: new List(),     // e.g., ['area-1'] - IDs of selected rooms/floors
  items: new List(),     // e.g., ['sofa-1', 'chair-2'] - IDs of selected furniture
}, 'ElementsSet') {
  constructor(json = {}) {
    super({
      vertices: new List(json.vertices || []),
      lines: new List(json.lines || []),
      holes: new List(json.holes || []),
      areas: new List(json.areas || []),
      items: new List(json.items || [])
    });
  }
}

const sharedAttributes =
{
  id: '',               // e.g., 'line-abc123', 'item-xyz789' - unique element ID
  type: '',             // e.g., 'wall', 'sofa', 'door' - catalog element type name
  prototype: '',        // e.g., 'lines', 'items', 'holes' - element category
  name: '',             // e.g., 'Wall 1', 'Sofa 3' - human-readable name
  misc: new Map(),      // e.g., { _unitLength: 'cm', customData: '...' } - extra metadata
  selected: false,      // e.g., true when element is clicked/selected by user
  properties: new Map(), // e.g., { width: 20, height: 280, color: '#fff' } - element-specific properties
  visible: true         // e.g., false to hide element without deleting it
};

export class Vertex extends Record({
  ...sharedAttributes,
  x: -1,                  // e.g., 150.5 - horizontal position in cm (or current unit)
  y: -1,                  // e.g., 300.0 - vertical position in cm (or current unit)
  prototype: 'vertices',  // Always 'vertices' for vertex elements
  lines: new List(),      // e.g., ['line-1', 'line-2'] - IDs of walls connected to this vertex (corner)
  areas: new List()       // e.g., ['area-1'] - IDs of rooms that use this vertex as a corner
}, 'Vertex') {
  constructor(json = {}) {
    super({
      ...json,
      lines: new List(json.lines || []),
      areas: new List(json.areas || [])
    });
  }
}

export class Line extends Record({
  ...sharedAttributes,           // properties e.g., { width: 20, height: 280, texture: 'brick' } - wall dimensions & appearance
  prototype: 'lines',            // Always 'lines' for wall elements
  vertices: new List(),          // e.g., ['vertex-1', 'vertex-2'] - start and end point IDs (always 2 vertices)
  holes: new List()              // e.g., ['door-1', 'window-2'] - IDs of doors/windows cut into this wall
}, 'Line') {
  constructor(json = {}) {
    super({
      ...json,
      properties: fromJS(json.properties || {}),
      vertices: new List(json.vertices || []),
      holes: new List(json.holes || []),
    });
  }
}

export class Hole extends Record({
  ...sharedAttributes,           // properties e.g., { width: 80, height: 210, altitude: 0 } - door/window dimensions
  prototype: 'holes',            // Always 'holes' for door/window elements
  offset: -1,                    // e.g., 0.3 means 30% along the wall (0.0 = start, 1.0 = end, 0.5 = middle)
  line: ''                       // e.g., 'line-5' - ID of the parent wall this hole is cut into
}, 'Hole') {
  constructor(json = {}) {
    super({
      ...json,
      properties: fromJS(json.properties || {})
    });
  }
}

export class Area extends Record({
  ...sharedAttributes,           // properties e.g., { texture: 'wood', color: '#8B4513' } - floor material & color
  prototype: 'areas',            // Always 'areas' for floor/room polygon elements
  vertices: new List(),          // e.g., ['v1', 'v2', 'v3', 'v4'] - ordered vertex IDs forming room boundary (closed polygon)
  holes: new List()              // e.g., ['area-2'] - IDs of inner areas (like a courtyard inside a building)
}, 'Area') {
  constructor(json = {}) {
    super({
      ...json,
      properties: fromJS(json.properties || {}),
      vertices: new List(json.vertices || [])
    });
  }
}

export class Item extends Record({
  ...sharedAttributes,           // properties e.g., { width: 180, depth: 60, height: 70, color: 'brown' } - furniture dimensions
  prototype: 'items',            // Always 'items' for furniture/object elements
  x: 0,                          // e.g., 500.5 - horizontal center position in cm (or current unit)
  y: 0,                          // e.g., 300.0 - vertical center position in cm (or current unit)
  rotation: 0                    // e.g., 90 - rotation angle in degrees (0-360, where 0 = facing right)
}, 'Item') {
  constructor(json = {}) {
    super({
      ...json,
      properties: fromJS(json.properties || {})
    });
  }
}

export class Layer extends Record({
  id: '',                        // e.g., 'layer-1', 'floor-2' - unique layer identifier
  altitude: 0,                   // e.g., 0, 300, 600 - height in cm for multi-story buildings (0 = ground floor)
  order: 0,                      // e.g., 0, 1, 2 - rendering/display order (lower numbers drawn first)
  opacity: 1,                    // e.g., 1.0, 0.5 - layer transparency (0.0 = invisible, 1.0 = opaque)
  name: '',                      // e.g., 'Ground Floor', 'Basement', '2nd Floor' - human-readable layer name
  visible: true,                 // e.g., false to hide entire layer (useful for multi-floor editing)
  vertices: new Map(),           // e.g., Map { 'v1' => Vertex{x:100, y:200}, 'v2' => Vertex{...} } - all vertices on layer
  lines: new Map(),              // e.g., Map { 'line-1' => Line{vertices:['v1','v2']}, ... } - all walls on layer
  holes: new Map(),              // e.g., Map { 'door-1' => Hole{line:'line-1', offset:0.5}, ... } - all doors/windows on layer
  areas: new Map(),              // e.g., Map { 'area-1' => Area{vertices:['v1','v2','v3']}, ... } - all rooms on layer
  items: new Map(),              // e.g., Map { 'sofa-1' => Item{x:500, y:300}, ... } - all furniture on layer
  selected: new ElementsSet(),   // e.g., ElementsSet { lines: ['line-1'], items: ['sofa-1'] } - currently selected elements
}, 'Layer') {
  constructor(json = {}) {
    super({
      ...json,
      vertices: safeLoadMapList(json.vertices, Vertex),
      lines: safeLoadMapList(json.lines, Line),
      holes: safeLoadMapList(json.holes, Hole),
      areas: safeLoadMapList(json.areas, Area),
      items: safeLoadMapList(json.items, Item),
      selected: new ElementsSet(json.selected)
    });
  }
}

export class Group extends Record({
  ...sharedAttributes,           // properties e.g., { locked: true } - group-level settings
  prototype: 'groups',           // Always 'groups' for grouped element collections
  x: 0,                          // e.g., 250.0 - group center x position (used for group transformations)
  y: 0,                          // e.g., 150.0 - group center y position (used for group transformations)
  rotation: 0,                   // e.g., 45 - group rotation angle in degrees (rotates all elements together)
  elements: new Map()            // e.g., Map { 'layer-1' => { lines: ['line-1'], items: ['sofa-1', 'table-1'] } } - grouped elements by layer
}, 'Group') {
  constructor(json = {}) {
    super({
      ...json,
      properties: fromJS(json.properties || {}),
      elements: fromJS(json.elements || {})
    });
  }
}


export const DefaultLayers = new Map({
  'layer-1': new Layer({id: 'layer-1', name: 'default'})
});


export class Scene extends Record({
  unit: 'cm',                    // e.g., 'cm', 'm', 'in', 'ft' - measurement unit for all dimensions
  layers: new Map(),             // e.g., Map { 'layer-1' => Layer{...}, 'floor-2' => Layer{...} } - all floor levels
  grids: new Map(),              // e.g., Map { 'h1' => Grid{type:'horizontal-streak'}, ... } - background grid lines
  selectedLayer: null,           // e.g., 'layer-1' - ID of currently active layer for editing
  groups: new Map(),             // e.g., Map { 'group-1' => Group{elements:{...}}, ... } - all element groups
  width: 12000,                   // e.g., 3000 - scene canvas width in current unit (3000cm = 30m)
  height: 12000,                  // e.g., 2000 - scene canvas height in current unit (2000cm = 20m)
  meta: new Map(),               // e.g., { projectName: 'My House', client: 'John Doe', date: '2025-11-19' } - custom project metadata
  guides: new Map()              // e.g., { horizontal: Map{'g1'=>100}, vertical: Map{'g2'=>250}, circular: Map{} } - snap guide lines
}, 'Scene') {
  constructor(json = {}) {
    let layers = safeLoadMapList(json.layers, Layer, DefaultLayers);
    super({
      ...json,
      grids: safeLoadMapList(json.grids, Grid, DefaultGrids),
      layers,
      selectedLayer: layers.first().id,
      groups: safeLoadMapList(json.groups || {}, Group),
      meta: json.meta ? fromJS(json.meta) : new Map(),
      guides: json.guides ? fromJS(json.guides) : new Map({ horizontal: new Map(), vertical: new Map(), circular: new Map() })
    });
  }
}

export class CatalogElement extends Record({
  name: '',              // e.g., 'sofa', 'wall', 'window' - unique catalog element type identifier
  prototype: '',         // e.g., 'items', 'lines', 'holes', 'areas' - element category
  info: new Map(),       // e.g., { title: 'Leather Sofa', description: 'Modern 3-seater', tag: ['furniture'], image: 'sofa.png' }
  properties: new Map(), // e.g., { width: {type:'length-measure', defaultValue:180}, color: {type:'color', defaultValue:'#8B4513'} }
}, 'CatalogElement') {
  constructor(json = {}) {
    super({
      ...json,
      info: fromJS(json.info),
      properties: fromJS(json.properties)
    });
  }
}

export class Catalog extends Record({
  ready: false,          // e.g., true when all catalog elements have been registered and loaded
  page: 'root',          // e.g., 'root', 'furniture', 'doors' - current catalog navigation page/category
  path: new List(),      // e.g., ['root', 'furniture', 'seating'] - breadcrumb path in catalog hierarchy
  elements: new Map(),   // e.g., Map { 'sofa' => CatalogElement{...}, 'wall' => CatalogElement{...} } - all registered element types
}, 'Catalog') {
  constructor(json = {}) {
    let elements = safeLoadMapList(json.elements, CatalogElement);
    super({
      elements,
      ready: !elements.isEmpty()
    });
  }

  factoryElement(type, options, initialProperties) {
    if (!this.elements.has(type)) {
      let catList = this.elements.map(element => element.name).toArray();
      throw new Error(`Element ${type} does not exist in catalog ${catList}`);
    }

    let element = this.elements.get(type);
    let properties = element.properties.map((value, key) => initialProperties && initialProperties.has(key) ? initialProperties.get(key) : value.get('defaultValue'));

    switch (element.prototype) {
      case 'lines':
        return new Line(options).merge({properties});

      case 'holes':
        return new Hole(options).merge({properties});

      case 'areas':
        return new Area(options).merge({properties});

      case 'items':
        return new Item(options).merge({properties});

      default:
        throw new Error('prototype not valid');
    }
  }
}

export class HistoryStructure extends Record({
  list: new List(),      // e.g., [{ time: 1638123456, diff: {...} }, ...] - list of scene change diffs for undo/redo
  first: null,           // e.g., Scene{...} - initial scene state when history started
  last: null             // e.g., Scene{...} - most recent scene state (current state)
}, 'HistoryStructure' ){
  constructor( json = {} ){
    super({
      list: fromJS( json.list || [] ),
      first: new Scene( json.scene ),
      last: new Scene( json.last || json.scene )
    });
  }
}

export class State extends Record({
  mode: MODE_IDLE,                      // e.g., 'MODE_IDLE', 'MODE_DRAWING_LINE', 'MODE_3D_VIEW' - current tool/interaction mode
  scene: new Scene(),                   // The complete floor plan (layers, elements, dimensions)
  sceneHistory: new HistoryStructure(), // Undo/redo history with diffs
  catalog: new Catalog(),               // Library of available element types (walls, furniture, doors, etc.)
  viewer2D: new Map(),  // Initial centered view with zoom 0.6
  mouse: new Map({x: 0, y: 0}),        // e.g., { x: 450.5, y: 320.0 } - current mouse cursor position in scene coordinates
  zoom: 0,                              // e.g., 0.8, 1.0, 1.5 - current zoom level (1.0 = 100%)
  snapMask: SNAP_MASK,                  // e.g., { SNAP_POINT: true, SNAP_LINE: true, SNAP_GRID: false } - which snap types are enabled
  snapElements: new List(),             // e.g., [PointSnap{x:100, y:200}, LineSnap{...}] - computed snap candidates near cursor
  activeSnapElement: null,              // e.g., PointSnap{x:100, y:200} - the snap target currently being snapped to (highlighted)
  drawingSupport: new Map(),            // e.g., { type: 'wall', layerID: 'layer-1' } - temporary data while drawing a new element
  draggingSupport: new Map(),           // e.g., { layerID: 'layer-1', itemID: 'sofa-1', startPointX: 100, startPointY: 200 } - drag operation state
  rotatingSupport: new Map(),           // e.g., { layerID: 'layer-1', itemID: 'sofa-1' } - rotation operation state
  textureApplication: new Map(),        // e.g., { textureKey: 'bricks', targetType: 'wall' } - texture application mode state
  errors: new List(),                   // e.g., ['Cannot delete vertex used by walls'] - error messages to display to user
  warnings: new List(),                 // e.g., ['Unsaved changes will be lost'] - warning messages to display
  clipboardProperties: new Map(),       // e.g., { width: 180, color: 'brown' } - copied properties for paste operation
  selectedElementsHistory: new List(),  // e.g., ['sofa', 'chair', 'table'] - recently used catalog element types for quick access
  misc: new Map(),                      // e.g., { aiSuggestions: [...], customFeature: '...' } - your custom app-specific data
  alterate: false,                       // e.g., true when Ctrl/Alt modifier key is held (for alternate behaviors)
  redoStack: new List()                 // Scenes saved when undo() is called, consumed by redo()
}, 'State') {
  constructor(json = {}) {
    super({
      ...json,
      scene: new Scene(json.scene),
      sceneHistory: new HistoryStructure(json),
      catalog: new Catalog(json.catalog || {}),
      viewer2D: new Map(json.viewer2D || {}),
      drawingSupport: new Map(json.drawingSupport || {}),
      draggingSupport: new Map(json.draggingSupport || {}),
      rotatingSupport: new Map(json.rotatingSupport || {}),
      textureApplication: new Map(json.textureApplication || {}),
      misc: json.misc ? fromJS(json.misc) : new Map()
    });
  }
}



