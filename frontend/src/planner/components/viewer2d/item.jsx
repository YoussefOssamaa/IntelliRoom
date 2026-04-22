import React from 'react';
import PropTypes from 'prop-types';
import If from '../../utils/react-if';

const STYLE_LINE = {
  fill: "#0096fd",
  stroke: "#0096fd"
};

const STYLE_CIRCLE = {
  fill: "#0096fd",
  stroke: "#0096fd",
  cursor: "ew-resize"
};

const STYLE_CIRCLE2 = {
  fill: "none",
  stroke: "#0096fd",
  cursor: "ew-resize"
};

const PREVIEW_FRAME_STYLE = {
  fill: 'rgba(255,255,255,0.92)',
  stroke: '#0096fd',
  strokeWidth: '2px'
};

const PREVIEW_ARROW_STYLE = {
  stroke: '#0096fd',
  strokeWidth: '2px',
  fill: 'none',
  strokeLinecap: 'round'
};

function renderPlacementPreview(item, catalog, layer, scene) {
  const width = item.properties?.getIn(['width', 'length']) || 200;
  const depth = item.properties?.getIn(['depth', 'length']) || 100;
  const image = catalog.getElement(item.type)?.info?.image;

  if (!image) {
    return catalog.getElement(item.type).render2D(item, layer, scene);
  }

  return (
    <g transform={`translate(${-width / 2},${-depth / 2})`}>
      <rect x="0" y="0" width={width} height={depth} rx="12" ry="12" style={PREVIEW_FRAME_STYLE} />
      <image
        href={image}
        x="0"
        y="0"
        width={width}
        height={depth}
        opacity="0.92"
        preserveAspectRatio="xMidYMid meet"
        transform={`translate(0, ${depth}) scale(1, -1)`}
      />
      <rect x="0" y="0" width={width} height={depth} rx="12" ry="12" fill="none" stroke="#0096fd" strokeWidth="2" />
      <line x1={width / 2} y1={depth} x2={width / 2} y2={depth + 28} style={PREVIEW_ARROW_STYLE} />
      <line x1={width / 2} y1={depth + 28} x2={width / 2 - 9} y2={depth + 18} style={PREVIEW_ARROW_STYLE} />
      <line x1={width / 2} y1={depth + 28} x2={width / 2 + 9} y2={depth + 18} style={PREVIEW_ARROW_STYLE} />
    </g>
  );
}

export default function Item({layer, item, scene, catalog, drawingItemID, isDrawingItem}) {

  let {x, y, rotation} = item;
  const isPlacementPreview = isDrawingItem && drawingItemID === item.id;

  // Guard: skip items with missing/empty type to avoid catalog crash
  if (!item.type) {
    console.warn('[Item 2D] skipping item with empty type, id:', item.id);
    return null;
  }

  let renderedItem = isPlacementPreview
    ? renderPlacementPreview(item, catalog, layer, scene)
    : catalog.getElement(item.type).render2D(item, layer, scene);

  return (
    <g
      data-element-root
      data-prototype={item.prototype}
      data-id={item.id}
      data-selected={item.selected}
      data-layer={layer.id}
      style={item.selected ? {cursor: "move"} : {}}
      transform={`translate(${x},${y}) rotate(${rotation})`}>

      {renderedItem}
      <If condition={item.selected && !isPlacementPreview}>
        <g data-element-root
           data-prototype={item.prototype}
           data-id={item.id}
           data-selected={item.selected}
           data-layer={layer.id}
           data-part="rotation-anchor"
        >
          <circle cx="0" cy="150" r="10" style={STYLE_CIRCLE}/>
          <circle cx="0" cy="0" r="150" style={STYLE_CIRCLE2}/>
        </g>
      </If>
    </g>
  )
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  layer: PropTypes.object.isRequired,
  scene: PropTypes.object.isRequired,
  catalog: PropTypes.object.isRequired,
  drawingItemID: PropTypes.string,
  isDrawingItem: PropTypes.bool
};

