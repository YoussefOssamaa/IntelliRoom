import React from 'react';
import PropTypes from 'prop-types';
import polylabel from 'polylabel';
import { computeInsetPolygon, polygonAreaShoelace, formatAreaM2 } from '../../catalog/factories/area-utils';

const STYLE_TEXT = {
  textAnchor: 'middle',
  fontSize: '12px',
  fontFamily: '"Courier New", Courier, monospace',
  pointerEvents: 'none',
  fontWeight: 'bold',

  //http://stackoverflow.com/questions/826782/how-to-disable-text-selection-highlighting-using-css
  WebkitTouchCallout: 'none', /* iOS Safari */
  WebkitUserSelect: 'none', /* Chrome/Safari/Opera */
  MozUserSelect: 'none', /* Firefox */
  MsUserSelect: 'none', /* Internet Explorer/Edge */
  userSelect: 'none'
};


export default function Area({layer, area, catalog}) {

  let rendered = catalog.getElement(area.type).render2D(area, layer);

  // Build vertex list with IDs so computeInsetPolygon can match walls
  const rawVerts = area.vertices.toArray().map(vertexID => {
    const { x, y, id } = layer.vertices.get(vertexID);
    return { x, y, id };
  });

  // Compute inset polygon (inner floor boundary, accounting for wall thickness)
  const insetVerts = computeInsetPolygon(rawVerts, layer);

  // Visual pole-of-inaccessibility (best label position) of the inset polygon
  const center = polylabel([insetVerts.map(v => [v.x, v.y])], 1.0);

  // Net inset floor area
  let areaSize = polygonAreaShoelace(insetVerts);

  // Subtract interior hole areas
  area.holes.forEach(holeID => {
    const hole = layer.areas.get(holeID);
    if (hole) {
      const holeVerts = hole.vertices.toArray().map(vertexID => {
        const { x, y, id } = layer.vertices.get(vertexID);
        return { x, y, id };
      });
      areaSize -= polygonAreaShoelace(holeVerts);
    }
  });

  // Always show the floor-area label (not only when selected)
  const renderedAreaSize = (
    <text
      x="0" y="0"
      transform={`translate(${center[0]} ${center[1]}) scale(1, -1)`}
      style={STYLE_TEXT}
    >
      {formatAreaM2(Math.max(0, areaSize))}
    </text>
  );

  return (
    <g
      data-element-root
      data-prototype={area.prototype}
      data-id={area.id}
      data-selected={area.selected}
      data-layer={layer.id}
    >
      {rendered}
      {renderedAreaSize}
    </g>
  )

}

Area.propTypes = {
  area: PropTypes.object.isRequired,
  layer: PropTypes.object.isRequired,
  catalog: PropTypes.object.isRequired
};



