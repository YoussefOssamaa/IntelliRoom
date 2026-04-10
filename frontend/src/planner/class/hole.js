import {Map, List, fromJS} from 'immutable';
import Layer from './layer';
import Group from './group';

import {
  IDBroker,
  NameGenerator
} from '../utils/export';

import {
  nearestSnap,
  addLineSegmentSnap,
} from '../utils/snap';

import {
  MODE_IDLE,
  MODE_DRAWING_HOLE,
  MODE_DRAWING_HOLE_3D,
  MODE_DRAGGING_HOLE,
  MODE_DRAGGING_HOLE_3D,
  MODE_3D_VIEW,
} from '../constants';

import {
  GeometryUtils
} from '../utils/export';

class Hole {

  static create(state, layerID, type, lineID, offset, properties) {

    let holeID = IDBroker.acquireID();

    let hole = state.catalog.factoryElement(type, {
      id: holeID,
      name: NameGenerator.generateName('holes', state.catalog.getIn(['elements', type, 'info', 'title'])),
      type,
      offset,
      line: lineID
    }, properties);

    state = state.setIn(['scene', 'layers', layerID, 'holes', holeID], hole);
    state = state.updateIn(['scene', 'layers', layerID, 'lines', lineID, 'holes'],
      holes => holes.push(holeID));

    return {updatedState: state, hole};
  }

  static select(state, layerID, holeID) {
    // Check if hole is already selected
    let isSelected = state.getIn(['scene', 'layers', layerID, 'holes', holeID, 'selected']);
    
    // Only process selection if not in a drawing/dragging mode
    const currentMode = state.get('mode');
    const isDrawingOrDragging = currentMode && (
      currentMode.includes('DRAWING') || 
      currentMode.includes('DRAGGING')
    );
    
    if (isDrawingOrDragging) {
      // Don't change selection during drawing/dragging
      return {updatedState: state};
    }
    
    if (isSelected) {
      // If already selected, unselect it
      state = this.unselect(state, layerID, holeID).updatedState;
    } else {
      // If not selected, select it
      state = Layer.select(state, layerID).updatedState;
      state = Layer.selectElement(state, layerID, 'holes', holeID).updatedState;
    }

    return {updatedState: state};
  }

  static remove(state, layerID, holeID) {
    let hole = state.getIn(['scene', 'layers', layerID, 'holes', holeID]);
    state = this.unselect(state, layerID, holeID).updatedState;
    state = Layer.removeElement(state, layerID, 'holes', holeID).updatedState;

    state = state.updateIn(['scene', 'layers', layerID, 'lines', hole.line, 'holes'], holes => {
      let index = holes.findIndex(ID => holeID === ID);
      return index !== -1 ? holes.remove(index) : holes;
    });

    state.getIn(['scene', 'groups']).forEach(group => state = Group.removeElement(state, group.id, layerID, 'holes', holeID).updatedState);

    return {updatedState: state};
  }

  static unselect(state, layerID, holeID) {
    state = Layer.unselect(state, layerID, 'holes', holeID).updatedState;

    return {updatedState: state};
  }

  static selectToolDrawingHole(state, sceneComponentType) {
    // First, deselect any currently selected holes to prevent duplication
    let layerID = state.scene.selectedLayer;
    state = Layer.unselectAll(state, layerID).updatedState;

    let snapElements = (new List()).withMutations(snapElements => {
      let {lines, vertices} = state.getIn(['scene', 'layers', state.scene.selectedLayer]);

      lines.forEach(line => {
        let {x: x1, y: y1} = vertices.get(line.vertices.get(0));
        let {x: x2, y: y2} = vertices.get(line.vertices.get(1));

        addLineSegmentSnap(snapElements, x1, y1, x2, y2, 20, 1, line.id);
      });
    });

    state = state.merge({
      mode: MODE_DRAWING_HOLE,
      snapElements,
      drawingSupport: Map({
        type: sceneComponentType
      })
    });

    return {updatedState: state};
  }

  static updateDrawingHole(state, layerID, x, y) {
    let catalog = state.catalog;
    const currentMode = state.get('mode');

    //calculate snap and overwrite coords if needed
    //force snap to segment
    let snap = nearestSnap(state.snapElements, x, y, state.snapMask.merge({SNAP_SEGMENT: true}));
    if (snap) ({x, y} = snap.point);

    let selectedHole = state.getIn(['scene', 'layers', layerID, 'selected', 'holes']).first();

    if (snap) {
      let lineID = snap.snap.related.get(0);

      let vertices = state.getIn(['scene', 'layers', layerID, 'lines', lineID, 'vertices']);
      let {x: x1, y: y1} = state.getIn(['scene', 'layers', layerID, 'vertices', vertices.get(0)]);
      let {x: x2, y: y2} = state.getIn(['scene', 'layers', layerID, 'vertices', vertices.get(1)]);

      // I need min and max vertices on this line segment
      let minVertex = GeometryUtils.minVertex({x: x1, y: y1}, {x: x2, y: y2});
      let maxVertex = GeometryUtils.maxVertex({x: x1, y: y1}, {x: x2, y: y2});
      let width = catalog.factoryElement(state.drawingSupport.get('type')).properties.getIn(['width', 'length']);

      // Now I need min and max possible coordinates for the hole on the line. They depend on the width of the hole
      let lineLength = GeometryUtils.pointsDistance(x1, y1, x2, y2);
      let alpha = GeometryUtils.absAngleBetweenTwoPoints(x1, y1, x2, y2);

      let cosAlpha = GeometryUtils.cosWithThreshold(alpha, 0.0000001);
      let sinAlpha = GeometryUtils.sinWithThreshold(alpha, 0.0000001);

      let minLeftVertexHole = {
        x: minVertex.x + width / 2 * cosAlpha,
        y: minVertex.y + width / 2 * sinAlpha
      };

      let maxRightVertexHole = {
        x: minVertex.x + lineLength * cosAlpha - width / 2 * cosAlpha,
        y: minVertex.y + lineLength * sinAlpha - width / 2 * sinAlpha
      };

      let offset;
      if (x < minLeftVertexHole.x) {
        offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
          maxVertex.x, maxVertex.y,
          minLeftVertexHole.x, minLeftVertexHole.y);
      } else if (x > maxRightVertexHole.x) {
        offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
          maxVertex.x, maxVertex.y,
          maxRightVertexHole.x, maxRightVertexHole.y);
      } else {

        if (x === minLeftVertexHole.x && x === maxRightVertexHole.x) {
          if (y < minLeftVertexHole.y) {
            offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
              maxVertex.x, maxVertex.y,
              minLeftVertexHole.x, minLeftVertexHole.y);
            offset = minVertex.x === x1 && minVertex.y === y1 ? offset : 1 - offset;
          } else if (y > maxRightVertexHole.y) {
            offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
              maxVertex.x, maxVertex.y,
              maxRightVertexHole.x, maxRightVertexHole.y);
            offset = minVertex.x === x1 && minVertex.y === y1 ? offset : 1 - offset;
          } else {
            offset = GeometryUtils.pointPositionOnLineSegment(x1, y1, x2, y2, x, y);
          }
        } else {
          offset = GeometryUtils.pointPositionOnLineSegment(x1, y1, x2, y2, x, y);
        }
      }

      //if hole does exist, update
      if (selectedHole && snap) {
        state = state.mergeIn(['scene', 'layers', layerID, 'holes', selectedHole], {offset, line: lineID});

        //remove from old line ( if present )
        let index = state.getIn(['scene', 'layers', layerID, 'lines']).findEntry(line => {
          return line.id !== lineID && line.get('holes').contains(selectedHole);
        });

        if (index) {
          let removed = index[1].get('holes').filter(hl => hl !== selectedHole);
          state = state.setIn(['scene', 'layers', layerID, 'lines', index[0], 'holes'], removed);
        }

        //add to line
        let line_holes = state.getIn(['scene', 'layers', layerID, 'lines', lineID, 'holes']);
        if (!line_holes.contains(selectedHole)) {
          state = state.setIn(['scene', 'layers', layerID, 'lines', lineID, 'holes'], line_holes.push(selectedHole));
        }
      } else if (!selectedHole && snap) {
        //if hole does not exist, create
        let {updatedState: stateH, hole} = this.create(state, layerID, state.drawingSupport.get('type'), lineID, offset);
        // Use Layer.selectElement directly instead of Hole.select, because Hole.select
        // guards against selection during DRAWING mode and would silently skip it,
        // causing a new hole to be created on every mouse move.
        state = Layer.selectElement(stateH, layerID, 'holes', hole.id).updatedState;
      }
    }
    //i've lost the snap while trying to drop the hole
    else if (false && selectedHole)  //think if enable
    {
      state = Hole.remove(state, layerID, selectedHole).updatedState;
    }

    return {updatedState: state};
  }

  static endDrawingHole(state, layerID, x, y) {
    state = this.updateDrawingHole(state, layerID, x, y).updatedState;
    state = Layer.unselectAll(state, layerID).updatedState;
    state = state.merge({mode: MODE_IDLE});
    return {updatedState: state};
  }

  static beginDraggingHole(state, layerID, holeID, x, y) {
    let layer = state.getIn(['scene', 'layers', layerID]);
    let hole = layer.getIn(['holes', holeID]);
    let line = layer.getIn(['lines', hole.line]);
    let v0 = layer.getIn(['vertices', line.vertices.get(0)]);
    let v1 = layer.getIn(['vertices', line.vertices.get(1)]);

    let snapElements = addLineSegmentSnap(List(), v0.x, v0.y, v1.x, v1.y, 9999999, 1, null);

    state = state.merge({
      mode: MODE_DRAGGING_HOLE,
      snapElements,
      draggingSupport: Map({
        layerID,
        holeID,
        startPointX: x,
        startPointY: y,
      })
    });

    return {updatedState: state};
  }

  static updateDraggingHole(state, x, y) {

    //calculate snap and overwrite coords if needed
    //force snap to segment
    let snap = nearestSnap(state.snapElements, x, y, state.snapMask.merge({SNAP_SEGMENT: true}));
    if (!snap) return state;

    let {draggingSupport, scene} = state;

    let layerID = draggingSupport.get('layerID');
    let holeID = draggingSupport.get('holeID');
    let startPointX = draggingSupport.get('startPointX');
    let startPointY = draggingSupport.get('startPointY');

    let layer = state.getIn(['scene', 'layers', layerID]);
    let hole = layer.getIn(['holes', holeID]);
    let line = layer.getIn(['lines', hole.line]);
    let v0 = layer.getIn(['vertices', line.vertices.get(0)]);
    let v1 = layer.getIn(['vertices', line.vertices.get(1)]);

    ({x, y} = snap.point);

    // I need min and max vertices on this line segment
    let minVertex = GeometryUtils.minVertex(v0, v1);
    let maxVertex = GeometryUtils.maxVertex(v0, v1);

    // Now I need min and max possible coordinates for the hole on the line. They depend on the width of the hole

    let width = hole.properties.get('width').get('length');
    let lineLength = GeometryUtils.pointsDistance(v0.x, v0.y, v1.x, v1.y);
    let alpha = Math.atan2(Math.abs(v1.y - v0.y), Math.abs(v1.x - v0.x));

    let cosWithThreshold = (alpha) => {
      let cos = Math.cos(alpha);
      return cos < 0.0000001 ? 0 : cos;
    };

    let sinWithThreshold = (alpha) => {
      let sin = Math.sin(alpha);
      return sin < 0.0000001 ? 0 : sin;
    };

    let cosAlpha = cosWithThreshold(alpha);
    let sinAlpha = sinWithThreshold(alpha);

    let minLeftVertexHole = {
      x: minVertex.x + width / 2 * cosAlpha,
      y: minVertex.y + width / 2 * sinAlpha
    };

    let maxRightVertexHole = {
      x: minVertex.x + lineLength * cosAlpha - width / 2 * cosAlpha,
      y: minVertex.y + lineLength * sinAlpha - width / 2 * sinAlpha
    };

    // Now I need to verify if the snap vertex (with coordinates x and y) is on the line segment

    let offset;

    if (x < minLeftVertexHole.x) {
      // Snap point is previous the the line
      offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
        maxVertex.x, maxVertex.y,
        minLeftVertexHole.x, minLeftVertexHole.y);
    } else {
      // Snap point is after the line or on the line
      if (x > maxRightVertexHole.x) {
        offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
          maxVertex.x, maxVertex.y,
          maxRightVertexHole.x, maxRightVertexHole.y);
      } else if (x === minLeftVertexHole.x && x === maxRightVertexHole.x) {
        // I am on a vertical line, I need to check y coordinates
        if (y < minLeftVertexHole.y) {
          offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
            maxVertex.x, maxVertex.y,
            minLeftVertexHole.x, minLeftVertexHole.y);

          offset = minVertex === v0 ? offset : 1 - offset;

        } else if (y > maxRightVertexHole.y) {
          offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
            maxVertex.x, maxVertex.y,
            maxRightVertexHole.x, maxRightVertexHole.y);

          offset = minVertex === v0 ? offset : 1 - offset;

        } else {
          offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
            maxVertex.x, maxVertex.y,
            x, y);

          offset = minVertex === v0 ? offset : 1 - offset;
        }
      } else {
        offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
          maxVertex.x, maxVertex.y,
          x, y);
      }
    }

    hole = hole.set('offset', offset);

    state = state.merge({
      scene: scene.mergeIn(['layers', layerID, 'holes', holeID], hole)
    });

    return {updatedState: state};
  }

  static endDraggingHole(state, x, y) {
    state = this.updateDraggingHole(state, x, y).updatedState;
    state = state.merge({mode: MODE_IDLE});

    return {updatedState: state};
  }

  static setProperties(state, layerID, holeID, properties) {
    state = state.setIn(['scene', 'layers', layerID, 'holes', holeID, 'properties'], properties);

    return {updatedState: state};
  }

  static setJsProperties(state, layerID, holeID, properties) {
    return this.setProperties(state, layerID, holeID, fromJS(properties));
  }

  static updateProperties(state, layerID, holeID, properties) {
    properties.forEach((v, k) => {
      if (state.hasIn(['scene', 'layers', layerID, 'holes', holeID, 'properties', k]))
        state = state.mergeIn(['scene', 'layers', layerID, 'holes', holeID, 'properties', k], v);
    });

    return {updatedState: state};
  }

  static updateJsProperties(state, layerID, holeID, properties) {
    return this.updateProperties(state, layerID, holeID, fromJS(properties));
  }

  static setAttributes(state, layerID, holeID, holesAttributes) {

    let hAttr = holesAttributes.toJS();
    let {offsetA, offsetB, offset} = hAttr;

    delete hAttr['offsetA'];
    delete hAttr['offsetB'];
    delete hAttr['offset'];

    let misc = new Map({_unitA: offsetA._unit, _unitB: offsetB._unit});

    state = state
      .mergeIn(['scene', 'layers', layerID, 'holes', holeID], fromJS(hAttr))
      .mergeDeepIn(['scene', 'layers', layerID, 'holes', holeID], new Map({offset, misc}));

    return {updatedState: state};
  }

  // ==================== 3D HOLE DRAWING METHODS ====================

  /**
   * Start 3D hole drawing mode - allows placing holes while in 3D view
   * This keeps the 3D view active instead of switching to 2D
   */
  static selectToolDrawingHole3D(state, sceneComponentType) {
    // First, deselect any currently selected holes to prevent duplication
    let layerID = state.scene.selectedLayer;
    state = Layer.unselectAll(state, layerID).updatedState;
    
    // Build snap elements for all lines in the current layer
    let snapElements = (new List()).withMutations(snapElements => {
      let {lines, vertices} = state.getIn(['scene', 'layers', state.scene.selectedLayer]);

      lines.forEach(line => {
        let {x: x1, y: y1} = vertices.get(line.vertices.get(0));
        let {x: x2, y: y2} = vertices.get(line.vertices.get(1));

        addLineSegmentSnap(snapElements, x1, y1, x2, y2, 20, 1, line.id);
      });
    });

    state = state.merge({
      mode: MODE_DRAWING_HOLE_3D,
      snapElements,
      drawingSupport: Map({
        type: sceneComponentType
      })
    });

    return {updatedState: state};
  }

  /**
   * Update hole position during 3D drawing
   * Converts 3D world coordinates to 2D floor plan coordinates and finds nearest wall
   */
  static updateDrawingHole3D(state, layerID, x, y, z, lineID, providedOffset) {
    let catalog = state.catalog;
    
    
    // Get the hole type from drawingSupport
    const holeType = state.getIn(['drawingSupport', 'type']);
    if (!holeType) {
      return {updatedState: state};
    }
    
    
    // In 3D mode, x is floor plan X, z is floor plan -Y (Three.js coordinate system)
    let floorX = x;
    let floorY = z;  // Changed from -z to z (subtract, not negate)

    // If a specific line is provided, use it; otherwise find the nearest line
    let targetLineID = lineID;
    
    if (!targetLineID) {
      // Find nearest line by snapping
      let snap = nearestSnap(state.snapElements, floorX, floorY, state.snapMask.merge({SNAP_SEGMENT: true}));
      if (snap) {
        targetLineID = snap.snap.related.get(0);
        ({x: floorX, y: floorY} = snap.point);
      }
    }

    if (!targetLineID) {
      return {updatedState: state};
    }

    let selectedHole = state.getIn(['scene', 'layers', layerID, 'selected', 'holes']).first();

    // updateDrawingHole3D is only for updating position during drawing, not for creating holes
    // Holes should only be created in endDrawingHole3D when user clicks to place
    if (!selectedHole) {

      return {updatedState: state};
    }
    
    let vertices = state.getIn(['scene', 'layers', layerID, 'lines', targetLineID, 'vertices']);
    let {x: x1, y: y1} = state.getIn(['scene', 'layers', layerID, 'vertices', vertices.get(0)]);
    let {x: x2, y: y2} = state.getIn(['scene', 'layers', layerID, 'vertices', vertices.get(1)]);

    // Calculate offset along the line
    let minVertex = GeometryUtils.minVertex({x: x1, y: y1}, {x: x2, y: y2});
    let maxVertex = GeometryUtils.maxVertex({x: x1, y: y1}, {x: x2, y: y2});
    let width = catalog.factoryElement(holeType).properties.getIn(['width', 'length']);
    let lineLength = GeometryUtils.pointsDistance(x1, y1, x2, y2);
    let alpha = GeometryUtils.absAngleBetweenTwoPoints(x1, y1, x2, y2);

    let cosAlpha = GeometryUtils.cosWithThreshold(alpha, 0.0000001);
    let sinAlpha = GeometryUtils.sinWithThreshold(alpha, 0.0000001);

    let minLeftVertexHole = {
      x: minVertex.x + width / 2 * cosAlpha,
      y: minVertex.y + width / 2 * sinAlpha
    };

    let maxRightVertexHole = {
      x: minVertex.x + lineLength * cosAlpha - width / 2 * cosAlpha,
      y: minVertex.y + lineLength * sinAlpha - width / 2 * sinAlpha
    };

    let offset;
    
    // If offset is provided (from 3D placement), use it directly
    if (typeof providedOffset === 'number') {

      offset = providedOffset;
    } else {
      // Otherwise calculate offset from floor coordinates

      if (floorX < minLeftVertexHole.x) {
        offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
          maxVertex.x, maxVertex.y,
          minLeftVertexHole.x, minLeftVertexHole.y);
      } else if (floorX > maxRightVertexHole.x) {
        offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
          maxVertex.x, maxVertex.y,
          maxRightVertexHole.x, maxRightVertexHole.y);
      } else {
        offset = GeometryUtils.pointPositionOnLineSegment(x1, y1, x2, y2, floorX, floorY);
      }
    }
    


    // Update existing hole position
    state = state.mergeIn(['scene', 'layers', layerID, 'holes', selectedHole], {offset, line: targetLineID});

    // Remove from old line if needed
    let index = state.getIn(['scene', 'layers', layerID, 'lines']).findEntry(line => {
      return line.id !== targetLineID && line.get('holes').contains(selectedHole);
    });

    if (index) {
      let removed = index[1].get('holes').filter(hl => hl !== selectedHole);
      state = state.setIn(['scene', 'layers', layerID, 'lines', index[0], 'holes'], removed);
    }

    // Add to line if not already there
    let line_holes = state.getIn(['scene', 'layers', layerID, 'lines', targetLineID, 'holes']);
    if (!line_holes.contains(selectedHole)) {
      state = state.setIn(['scene', 'layers', layerID, 'lines', targetLineID, 'holes'], line_holes.push(selectedHole));
    }

    return {updatedState: state};
  }

  /**
   * End 3D hole drawing and return to 3D view mode
   * This is called when the user clicks to place the hole
   */
  static endDrawingHole3D(state, layerID, x, y, z, lineID, offset) {

    
    // Get the hole type from drawingSupport
    const holeType = state.getIn(['drawingSupport', 'type']);
    if (!holeType) {

      return {updatedState: state};
    }
    
    // Create the hole at the specified position
    let {updatedState: stateH, hole} = this.create(state, layerID, holeType, lineID, offset);

    
    // Select the newly created hole so user can configure it
    state = Layer.select(stateH, layerID).updatedState;
    state = Layer.selectElement(state, layerID, 'holes', hole.id).updatedState;
    


    return {updatedState: state};
  }

  // ==================== 3D HOLE DRAGGING METHODS ====================

  /**
   * Start dragging a hole in 3D view.
   * Snap elements are built for ALL lines in the layer so the hole can
   * jump between walls during drag.
   */
  static beginDraggingHole3D(state, layerID, holeID, x, y, z) {
    let layer = state.getIn(['scene', 'layers', layerID]);

    // Build snap elements for every wall, not just the current one
    let snapElements = (new List()).withMutations(se => {
      let { lines, vertices } = layer;
      lines.forEach(line => {
        let v0 = vertices.get(line.vertices.get(0));
        let v1 = vertices.get(line.vertices.get(1));
        if (!v0 || !v1) return;
        addLineSegmentSnap(se, v0.x, v0.y, v1.x, v1.y, 9999999, 1, line.id);
      });
    });

    state = state.merge({
      mode: MODE_DRAGGING_HOLE_3D,
      snapElements,
      draggingSupport: Map({
        layerID,
        holeID,
        lineID: layer.getIn(['holes', holeID, 'line']),
        startPointX: x,
        startPointY: y,
        startPointZ: z,
      })
    });

    return {updatedState: state};
  }

  /**
   * Update hole position while dragging in 3D.
   * Detects the nearest wall from the snap and reassigns the hole if it
   * moved to a different wall.
   */
  static updateDraggingHole3D(state, x, y, z, lineID) {
    let floorX = x;
    let floorY = -z;

    let snap = nearestSnap(state.snapElements, floorX, floorY, state.snapMask.merge({SNAP_SEGMENT: true}));
    if (!snap) return {updatedState: state};

    let {draggingSupport, scene} = state;
    let layerID = draggingSupport.get('layerID');
    let holeID = draggingSupport.get('holeID');

    let layer = state.getIn(['scene', 'layers', layerID]);
    let hole = layer.getIn(['holes', holeID]);

    // Determine which wall the snap landed on
    let targetLineID = snap.snap.related ? snap.snap.related.get(0) : hole.line;
    if (!targetLineID || !layer.getIn(['lines', targetLineID])) targetLineID = hole.line;

    let targetLine = layer.getIn(['lines', targetLineID]);
    let v0 = layer.getIn(['vertices', targetLine.vertices.get(0)]);
    let v1 = layer.getIn(['vertices', targetLine.vertices.get(1)]);

    ({x: floorX, y: floorY} = snap.point);

    let minVertex = GeometryUtils.minVertex(v0, v1);
    let maxVertex = GeometryUtils.maxVertex(v0, v1);
    let width = hole.properties.get('width').get('length');
    let lineLength = GeometryUtils.pointsDistance(v0.x, v0.y, v1.x, v1.y);
    let alpha = Math.atan2(Math.abs(v1.y - v0.y), Math.abs(v1.x - v0.x));

    let cosAlpha = GeometryUtils.cosWithThreshold(alpha, 0.0000001);
    let sinAlpha = GeometryUtils.sinWithThreshold(alpha, 0.0000001);

    let minLeftVertexHole = {
      x: minVertex.x + width / 2 * cosAlpha,
      y: minVertex.y + width / 2 * sinAlpha
    };
    let maxRightVertexHole = {
      x: minVertex.x + lineLength * cosAlpha - width / 2 * cosAlpha,
      y: minVertex.y + lineLength * sinAlpha - width / 2 * sinAlpha
    };

    let offset;
    if (floorX < minLeftVertexHole.x) {
      offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
        maxVertex.x, maxVertex.y, minLeftVertexHole.x, minLeftVertexHole.y);
    } else if (floorX > maxRightVertexHole.x) {
      offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
        maxVertex.x, maxVertex.y, maxRightVertexHole.x, maxRightVertexHole.y);
    } else {
      offset = GeometryUtils.pointPositionOnLineSegment(minVertex.x, minVertex.y,
        maxVertex.x, maxVertex.y, floorX, floorY);

      if (minVertex.x !== v0.x || minVertex.y !== v0.y) {
        offset = 1 - offset;
      }
    }

    // If the hole jumped to a different wall, move it
    if (targetLineID !== hole.line) {
      // Remove from old wall's hole list
      let oldHoles = state.getIn(['scene', 'layers', layerID, 'lines', hole.line, 'holes']);
      if (oldHoles) {
        oldHoles = oldHoles.filter(h => h !== holeID);
        state = state.setIn(['scene', 'layers', layerID, 'lines', hole.line, 'holes'], oldHoles);
      }
      // Add to new wall's hole list
      let newHoles = state.getIn(['scene', 'layers', layerID, 'lines', targetLineID, 'holes']);
      if (newHoles && !newHoles.contains(holeID)) {
        state = state.setIn(['scene', 'layers', layerID, 'lines', targetLineID, 'holes'], newHoles.push(holeID));
      }
      hole = hole.set('line', targetLineID);
      // Refresh scene ref after modification
      scene = state.scene;
    }

    hole = hole.set('offset', offset);

    state = state.merge({
      scene: scene.mergeIn(['layers', layerID, 'holes', holeID], hole)
    });

    return {updatedState: state};
  }

  /**
   * End dragging hole in 3D view
   */
  static endDraggingHole3D(state, x, y, z) {
    state = this.updateDraggingHole3D(state, x, y, z).updatedState;
    state = state.merge({mode: MODE_3D_VIEW});

    return {updatedState: state};
  }

}

export {Hole as default};
