import React from 'react';
import PropTypes from 'prop-types';
import { usePlanner } from '../../context/PlannerContext';

import { ReactSVGPanZoom, TOOL_NONE, TOOL_PAN, TOOL_ZOOM_IN, TOOL_ZOOM_OUT, TOOL_AUTO } from 'react-svg-pan-zoom';
import * as constants from '../../constants';
import State from './state';
import * as SharedStyle from '../../shared-style';

function mode2Tool(mode) {
  switch (mode) {
    case constants.MODE_2D_PAN:
      return TOOL_PAN;
    case constants.MODE_2D_ZOOM_IN:
      return TOOL_ZOOM_IN;
    case constants.MODE_2D_ZOOM_OUT:
      return TOOL_ZOOM_OUT;
    case constants.MODE_IDLE:
      return TOOL_AUTO;
    default:
      return TOOL_NONE;
  }
}

function mode2PointerEvents(mode) {
  switch (mode) {
    case constants.MODE_DRAWING_LINE:
    case constants.MODE_DRAWING_HOLE:
    case constants.MODE_DRAWING_ITEM:
    case constants.MODE_DRAGGING_HOLE:
    case constants.MODE_DRAGGING_ITEM:
    case constants.MODE_DRAGGING_LINE:
    case constants.MODE_DRAGGING_VERTEX:
      return { pointerEvents: 'none' };

    default:
      return {};
  }
}

function mode2Cursor(mode) {
  switch (mode) {
    case constants.MODE_DRAGGING_HOLE:
    case constants.MODE_DRAGGING_LINE:
    case constants.MODE_DRAGGING_VERTEX:
    case constants.MODE_DRAGGING_ITEM:
      return { cursor: 'move' };

    case constants.MODE_ROTATING_ITEM:
      return { cursor: 'ew-resize' };

    case constants.MODE_WAITING_DRAWING_LINE:
    case constants.MODE_DRAWING_LINE:
      return { cursor: 'crosshair' };
    default:
      return { cursor: 'default' };
  }
}

function mode2DetectAutopan(mode) {
  switch (mode) {
    case constants.MODE_DRAWING_LINE:
    case constants.MODE_DRAGGING_LINE:
    case constants.MODE_DRAGGING_VERTEX:
    case constants.MODE_DRAGGING_HOLE:
    case constants.MODE_DRAGGING_ITEM:
    case constants.MODE_DRAWING_HOLE:
    case constants.MODE_DRAWING_ITEM:
      return true;

    default:
      return false;
  }
}

function extractElementData(node) {
  while (!node.attributes.getNamedItem('data-element-root') && node.tagName !== 'svg') {
    node = node.parentNode;
  }
  if (node.tagName === 'svg') return null;

  return {
    part: node.attributes.getNamedItem('data-part') ? node.attributes.getNamedItem('data-part').value : undefined,
    layer: node.attributes.getNamedItem('data-layer').value,
    prototype: node.attributes.getNamedItem('data-prototype').value,
    selected: node.attributes.getNamedItem('data-selected').value === 'true',
    id: node.attributes.getNamedItem('data-id').value
  }
}

export default function Viewer2D({ state, width, height }) {
  const { viewer2DActions, linesActions, holesActions, verticesActions, itemsActions, areaActions, projectActions, catalog } = usePlanner();
  const viewerRef = React.useRef(null);
  const hasInitializedRef = React.useRef(false);
  // Track whether the last zoom change came from the viewer itself (scroll/pinch)
  // to prevent a feedback loop with BottomRightControls.
  const lastInternalZoomRef = React.useRef(null);

  let { viewer2D, mode, scene } = state;

  let layerID = scene.selectedLayer;

  // Use a ref to always hold the latest state/mode values.
  // In React 18, function component closures can become stale if
  // ReactSVGPanZoom caches callback props across renders. By reading
  // from a ref, event handlers always see the latest values regardless
  // of which render's closure they were created in.
  const stateRef = React.useRef({ mode, layerID, state, scene });
  stateRef.current = { mode, layerID, state, scene };

  let mapCursorPosition = ({ x, y }) => {
    return { x, y: -y + scene.height }
  };

  let onMouseMove = viewerEvent => {

    //workaround that allow imageful component to work
    let evt = new Event('mousemove-planner-event');
    evt.viewerEvent = viewerEvent;
    document.dispatchEvent(evt);

    let { x, y } = mapCursorPosition(viewerEvent);

    // Read the latest mode from ref to avoid stale closure issues
    let currentMode = stateRef.current.mode;
    let currentLayerID = stateRef.current.layerID;
    let currentState = stateRef.current.state;

    projectActions.updateMouseCoord({ x, y });

    switch (currentMode) {
      case constants.MODE_DRAWING_LINE:
        linesActions.updateDrawingLine(x, y, currentState.snapMask);
        break;

      case constants.MODE_DRAWING_HOLE:
        console.log('[viewer2d.onMouseMove] MODE_DRAWING_HOLE | dispatching updateDrawingHole | x:', Math.round(x), 'y:', Math.round(y));
        holesActions.updateDrawingHole(currentLayerID, x, y);
        break;

      case constants.MODE_DRAWING_ITEM:
        itemsActions.updateDrawingItem(currentLayerID, x, y);
        break;

      case constants.MODE_DRAGGING_HOLE:
        holesActions.updateDraggingHole(x, y);
        break;

      case constants.MODE_DRAGGING_LINE:
        linesActions.updateDraggingLine(x, y, currentState.snapMask);
        break;

      case constants.MODE_DRAGGING_VERTEX:
        verticesActions.updateDraggingVertex(x, y, currentState.snapMask);
        break;

      case constants.MODE_DRAGGING_ITEM:
        itemsActions.updateDraggingItem(x, y);
        break;

      case constants.MODE_ROTATING_ITEM:
        itemsActions.updateRotatingItem(x, y);
        break;
    }

    viewerEvent.originalEvent.stopPropagation();
  };

  let onMouseDown = viewerEvent => {
    let event = viewerEvent.originalEvent;

    //workaround that allow imageful component to work
    let evt = new Event('mousedown-planner-event');
    evt.viewerEvent = viewerEvent;
    document.dispatchEvent(evt);

    let { x, y } = mapCursorPosition(viewerEvent);

    // Read latest mode from ref
    let currentMode = stateRef.current.mode;
    let currentState = stateRef.current.state;

    if (currentMode === constants.MODE_IDLE) {
      let elementData = extractElementData(event.target);
      if (!elementData || !elementData.selected) return;

      switch (elementData.prototype) {
        case 'lines':
          linesActions.beginDraggingLine(elementData.layer, elementData.id, x, y, currentState.snapMask);
          break;

        case 'vertices':
          verticesActions.beginDraggingVertex(elementData.layer, elementData.id, x, y, currentState.snapMask);
          break;

        case 'items':
          if (elementData.part === 'rotation-anchor')
            itemsActions.beginRotatingItem(elementData.layer, elementData.id, x, y);
          else
            itemsActions.beginDraggingItem(elementData.layer, elementData.id, x, y);
          break;

        case 'holes':
          holesActions.beginDraggingHole(elementData.layer, elementData.id, x, y);
          break;

        default: break;
      }
    }
    event.stopPropagation();
  };

  let onMouseUp = viewerEvent => {
    let event = viewerEvent.originalEvent;

    let evt = new Event('mouseup-planner-event');
    evt.viewerEvent = viewerEvent;
    document.dispatchEvent(evt);

    let { x, y } = mapCursorPosition(viewerEvent);

    // Read latest mode from ref
    let currentMode = stateRef.current.mode;
    let currentLayerID = stateRef.current.layerID;
    let currentState = stateRef.current.state;

    switch (currentMode) {

      case constants.MODE_IDLE:
        let elementData = extractElementData(event.target);

        if (elementData && elementData.selected) return;

        switch (elementData ? elementData.prototype : 'none') {
          case 'areas':
            areaActions.selectArea(elementData.layer, elementData.id);
            break;

          case 'lines':
            linesActions.selectLine(elementData.layer, elementData.id);
            break;

          case 'holes':
            // Don't select holes if in drawing/dragging mode to prevent double-click issues
            const modeVal = currentState.get('mode');
            if (!modeVal || (!modeVal.includes('DRAWING') && !modeVal.includes('DRAGGING'))) {
              holesActions.selectHole(elementData.layer, elementData.id);
            }
            break;

          case 'items':
            itemsActions.selectItem(elementData.layer, elementData.id);
            break;

          case 'none':
            projectActions.unselectAll();
            break;
        }
        break;

      case constants.MODE_WAITING_DRAWING_LINE:
        linesActions.beginDrawingLine(currentLayerID, x, y, currentState.snapMask);
        break;

      case constants.MODE_DRAWING_LINE:
        linesActions.endDrawingLine(x, y, currentState.snapMask);
        linesActions.beginDrawingLine(currentLayerID, x, y, currentState.snapMask);
        break;

      case constants.MODE_DRAWING_HOLE:
        console.log('[viewer2d.onMouseUp] MODE_DRAWING_HOLE | dispatching endDrawingHole | x:', Math.round(x), 'y:', Math.round(y));
        holesActions.endDrawingHole(currentLayerID, x, y);
        console.log('[viewer2d.onMouseUp] endDrawingHole dispatched — stateRef mode now:', stateRef.current.mode);
        break;

      case constants.MODE_DRAWING_ITEM:
        itemsActions.endDrawingItem(currentLayerID, x, y);
        break;

      case constants.MODE_DRAGGING_LINE:
        linesActions.endDraggingLine(x, y, currentState.snapMask);
        break;

      case constants.MODE_DRAGGING_VERTEX:
        verticesActions.endDraggingVertex(x, y, currentState.snapMask);
        break;

      case constants.MODE_DRAGGING_ITEM:
        itemsActions.endDraggingItem(x, y);
        break;

      case constants.MODE_DRAGGING_HOLE:
        holesActions.endDraggingHole(x, y);
        break;

      case constants.MODE_ROTATING_ITEM:
        itemsActions.endRotatingItem(x, y);
        break;
    }

    event.stopPropagation();
  };

  let onChangeValue = (value) => {
    // Mark this as an internal zoom change (from scroll/pinch in the viewer)
    lastInternalZoomRef.current = value.a;
    projectActions.updateZoomScale(value.a);
    return viewer2DActions.updateCameraView(value)
  };

  // Guard onChangeTool: do NOT dispatch selectToolEdit() during drag/draw modes.
  // In React 18, ReactSVGPanZoom may call onChangeTool when the tool prop transitions
  // (e.g., from TOOL_AUTO to TOOL_NONE when entering drag mode). This would dispatch
  // selectToolEdit() which resets mode to MODE_IDLE, interrupting the drag operation
  // and causing the item to flicker between positions. This was not an issue in React 16
  // because synchronous rendering ensured the mode transition completed atomically.
  let onChangeTool = (tool) => {
    let currentMode = stateRef.current.mode;

    switch (tool) {
      case TOOL_NONE:
        // Only switch to edit mode when currently idle or in pan/zoom mode.
        // Never interrupt an active drag/draw/rotate operation.
        if (currentMode === constants.MODE_IDLE ||
            currentMode === constants.MODE_2D_PAN ||
            currentMode === constants.MODE_2D_ZOOM_IN ||
            currentMode === constants.MODE_2D_ZOOM_OUT) {
          projectActions.selectToolEdit();
        }
        break;

      case TOOL_PAN:
        viewer2DActions.selectToolPan();
        break;

      case TOOL_ZOOM_IN:
        viewer2DActions.selectToolZoomIn();
        break;

      case TOOL_ZOOM_OUT:
        viewer2DActions.selectToolZoomOut();
        break;
    }
  };

  let { e, f, SVGWidth, SVGHeight } = state.get('viewer2D').toJS();
  let sceneWidth = SVGWidth || state.getIn(['scene', 'width']);
  let sceneHeight = SVGHeight || state.getIn(['scene', 'height']);

  // Create initial value if viewer2D is empty
  let viewerValue = viewer2D.isEmpty() ? {
    version: 2,
    mode: 'idle',
    focus: false,
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: sceneWidth/2,
    f: sceneHeight/2,
    viewerWidth: width,
    viewerHeight: height,
    SVGWidth: sceneWidth,
    SVGHeight: sceneHeight,
    miniatureOpen: false
  } : viewer2D.toJS();

  // Auto-fit view to drawn elements on first load
  React.useEffect(() => {
    const layers = state.getIn(['scene', 'layers']);
    const needsInitialization = viewer2D.isEmpty() || 
                                (!viewer2D.has('e') && !viewer2D.has('f')) ||
                                (viewer2D.get('a') === undefined);
    if (viewerRef.current && needsInitialization && !hasInitializedRef.current) {
      // Delay initialization to ensure state is fully loaded from localStorage
      const initTimeout = setTimeout(() => {
        if (hasInitializedRef.current) return;
      
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasElements = false;

        // Calculate bounding box of all elements
        layers.forEach((layer) => {
          // Check vertices from lines
          layer.vertices.forEach((vertex) => {
            hasElements = true;
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
          });

          // Check items (furniture)
          layer.items.forEach((item) => {
            hasElements = true;
            minX = Math.min(minX, item.x);
            minY = Math.min(minY, item.y);
            maxX = Math.max(maxX, item.x);
            maxY = Math.max(maxY, item.y);
          });

          // Mark that elements exist if there are lines
          if (layer.lines.size > 0) {
            hasElements = true;
          }
        });

        let centerX, centerY, zoomLevel;
        if (hasElements && isFinite(minX) && isFinite(maxX)) {
          // Calculate center of drawn elements
          centerX = (minX + maxX) / 2;
          centerY = (minY + maxY) / 2;
          centerY =sceneHeight-centerY;
          // Calculate zoom to fit content with some padding
          const contentWidth = maxX - minX;
          const contentHeight = maxY - minY;
          const viewportWidth = width;
          const viewportHeight = height;
          
          const paddingFactor = 1.1;
          const zoomX = viewportWidth / (contentWidth * paddingFactor);
          const zoomY = viewportHeight / (contentHeight * paddingFactor);
          zoomLevel = Math.min(zoomX, zoomY, 1);
        } else {
          // No elements drawn, use scene center
          centerX = sceneWidth / 2;
          centerY = sceneHeight / 2;
          zoomLevel = 1;
          console.log("No elements to fit in view.");
          
        }

        viewerRef.current.setPointOnViewerCenter(centerX, centerY, zoomLevel);
        hasInitializedRef.current = true;
      }, 100); // 100ms delay to allow state to load
      
      return () => clearTimeout(initTimeout);
    }
  // Only depend on values needed for initialization; exclude 'state' which changes
  // on every dispatch (mouse coord updates, drag updates, etc.) and would cause
  // unnecessary effect scheduling during drag operations.
  }, [viewer2D, sceneWidth, sceneHeight, width, height]);

  // Sync zoom from external controls (BottomRightControls) to the SVG pan/zoom viewer.
  // When state.zoom changes via updateZoomScale but NOT from onChangeValue (internal),
  // apply the zoom to the react-svg-pan-zoom viewer so the 2D canvas actually zooms.
  const prevZoomRef = React.useRef(null);
  React.useEffect(() => {
    const currentZoom = state.zoom;
    if (!viewerRef.current || !currentZoom || currentZoom === 0) return;
    
    // Skip if this zoom came from the viewer itself (internal)
    if (lastInternalZoomRef.current !== null && Math.abs(lastInternalZoomRef.current - currentZoom) < 0.001) {
      lastInternalZoomRef.current = null;
      prevZoomRef.current = currentZoom;
      return;
    }
    lastInternalZoomRef.current = null;
    
    // Skip if zoom hasn't meaningfully changed
    if (prevZoomRef.current !== null && Math.abs(prevZoomRef.current - currentZoom) < 0.001) return;
    
    // Get the current viewer value to find the current center point
    const val = viewer2D.toJS();
    const currentScale = val.a || 1;
    
    if (Math.abs(currentScale - currentZoom) > 0.001) {
      // Calculate the center of the current viewport in SVG coordinates
      const viewerWidth = width;
      const viewerHeight = height;
      const svgCenterX = (viewerWidth / 2 - (val.e || 0)) / currentScale;
      const svgCenterY = (viewerHeight / 2 - (val.f || 0)) / currentScale;
      
      // Compute new e, f to keep the same SVG point at the viewport center
      const newE = viewerWidth / 2 - svgCenterX * currentZoom;
      const newF = viewerHeight / 2 - svgCenterY * currentZoom;
      
      // Update the viewer2D state directly with new transform
      const newValue = {
        ...val,
        a: currentZoom,
        d: currentZoom,
        e: newE,
        f: newF
      };
      viewer2DActions.updateCameraView(newValue);
    }
    
    prevZoomRef.current = currentZoom;
  }, [state.zoom]);

  return (
    <div style={{ margin: 0, padding: 0, position: 'relative' }}>
      <ReactSVGPanZoom
        ref={viewerRef}
        width={width}
        height={height}
        value={viewerValue}
        onChangeValue={onChangeValue}
        tool={mode2Tool(mode)}
        onChangeTool={onChangeTool}
        detectAutoPan={mode2DetectAutopan(mode)}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        miniatureProps={{ position: 'none' }}
        toolbarProps={{ position: 'none' }}
      >

        <svg width={scene.width} height={scene.height}>
          <defs>
            <pattern id="diagonalFill" patternUnits="userSpaceOnUse" width="4" height="4" fill="#FFF">
              <rect x="0" y="0" width="4" height="4" fill="#FFF" />
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" style={{ stroke: '#e7e7e7ff', strokeWidth: 1 }} />
            </pattern>
          </defs>
          <g style={Object.assign(mode2Cursor(mode), mode2PointerEvents(mode))}>
            <State state={state} catalog={catalog} />
          </g>
        </svg>

      </ReactSVGPanZoom>
    </div>
  );
}


Viewer2D.propTypes = {
  state: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};


