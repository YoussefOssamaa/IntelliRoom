import React from 'react';
import PropTypes from 'prop-types';
import Viewer2D from './viewer2d/viewer2d';
import Viewer3D from './viewer3d/viewer3d';
import Viewer3DFirstPerson from './viewer3d/viewer3d-first-person';
import CatalogList from './catalog-view/catalog-list';
import ProjectConfigurator from './configurator/project-configurator';

import * as constants from '../constants';

// Modes where Viewer3D is the active (visible) canvas
const VIEWER3D_MODES = new Set([
  constants.MODE_3D_VIEW,
  constants.MODE_DRAWING_ITEM_3D,
  constants.MODE_DRAGGING_ITEM_3D,
  constants.MODE_DRAWING_HOLE_3D,
  constants.MODE_DRAGGING_HOLE_3D,
  constants.MODE_APPLYING_TEXTURE,
  constants.MODE_3D_MEASURE,
]);

export default function Content({width, height, state, customContents}) {
  let mode = state.get('mode');
  const is3DActive = VIEWER3D_MODES.has(mode);

  // Viewer3D is kept permanently mounted so window.__viewer3D stays alive
  // in 2D mode, giving SmartPreview's mini-view a live scene to render.
  // The canvas is hidden (display:none) when not in an active 3D mode so it
  // doesn't intercept mouse/keyboard events and doesn't affect layout.
  const viewer3DEl = mode !== constants.MODE_3D_FIRST_PERSON ? (
    <div style={{ display: is3DActive ? 'block' : 'none', width, height, position: 'absolute', top: 0, left: 0 }}>
      <Viewer3D state={state} width={width} height={height}/>
    </div>
  ) : null;

  switch (mode) {
    case constants.MODE_3D_VIEW:
    case constants.MODE_DRAWING_ITEM_3D:
    case constants.MODE_DRAGGING_ITEM_3D:
    case constants.MODE_DRAWING_HOLE_3D:
    case constants.MODE_DRAGGING_HOLE_3D:
    case constants.MODE_APPLYING_TEXTURE:
    case constants.MODE_3D_MEASURE:
      return viewer3DEl;

    case constants.MODE_3D_FIRST_PERSON:
      return <Viewer3DFirstPerson state={state} width={width} height={height}/>;

    // case constants.MODE_VIEWING_CATALOG:
    //   return <CatalogList state={state} width={width} height={height}/>;

    case constants.MODE_IDLE:
    case constants.MODE_2D_ZOOM_IN:
    case constants.MODE_2D_ZOOM_OUT:
    case constants.MODE_2D_PAN:
    case constants.MODE_WAITING_DRAWING_LINE:
    case constants.MODE_DRAGGING_LINE:
    case constants.MODE_DRAGGING_VERTEX:
    case constants.MODE_DRAGGING_ITEM:
    case constants.MODE_DRAWING_LINE:
    case constants.MODE_DRAWING_HOLE:
    case constants.MODE_DRAWING_ITEM:
    case constants.MODE_DRAGGING_HOLE:
    case constants.MODE_ROTATING_ITEM:
      // Keep Viewer3D mounted (hidden) so window.__viewer3D stays live for SmartPreview.
      return <>{viewer3DEl}<Viewer2D state={state} width={width} height={height}/></>

    case constants.MODE_CONFIGURING_PROJECT:
      return <ProjectConfigurator width={width} height={height} state={state}/>;

    default:
      if (customContents.hasOwnProperty(mode)) {
        let CustomContent = customContents[mode];
        return <CustomContent width={width} height={height} state={state}/>
      } else {
        throw new Error(`Mode ${mode} doesn't have a mapped content`);
      }
  }
}

Content.propTypes = {
  state: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired
};
