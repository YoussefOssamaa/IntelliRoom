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

const STYLE_FALLBACK_ITEM = {
  fill: "rgba(91, 141, 239, 0.18)",
  stroke: "#5b8def",
  strokeWidth: 1,
};

function getCatalogElement(catalog, type) {
  if (!catalog || !type) return null;

  if (typeof catalog.hasElement === "function" && !catalog.hasElement(type)) {
    return null;
  }

  try {
    return catalog.getElement(type);
  } catch (_) {
    return null;
  }
}

function getItemPreviewImage(item, catalogElement) {
  const catalogInfo = catalogElement?.info || {};

  const asset = item?.asset;
  const assetTopView =
    (typeof asset?.get === "function" ? asset.get("topViewUrl") : asset?.topViewUrl) ||
    "";
  const assetThumbnail =
    (typeof asset?.get === "function"
      ? asset.get("thumbnailUrl")
      : asset?.thumbnailUrl) || "";
  const catalogThumbnail = catalogInfo?.thumbnailUrl || "";

  return (
    catalogInfo?.topViewUrl ||
    item?.topViewUrl ||
    assetTopView ||
    catalogInfo?.image ||
    catalogThumbnail ||
    item?.thumbnailUrl ||
    assetThumbnail ||
    null
  );
}

function renderPlacementPreview(item, catalogElement, layer, scene) {
  const width = item.properties?.getIn(['width', 'length']) || 200;
  const depth = item.properties?.getIn(['depth', 'length']) || 100;
  const image = getItemPreviewImage(item, catalogElement);

  if (!image) {
    if (catalogElement?.render2D) {
      return catalogElement.render2D(item, layer, scene);
    }

    return (
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        style={STYLE_FALLBACK_ITEM}
      />
    );
  }

  return (
    <g transform={`translate(${-width / 2},${-depth / 2})`}>
      <image
        href={image}
        xlinkHref={image}
        x="0"
        y="0"
        width={width}
        height={depth}
        opacity="1"
        preserveAspectRatio="none"
        style={{ backgroundColor: "transparent" }}
        transform={`translate(0, ${depth}) scale(1, -1) rotate(180 ${width / 2} ${depth / 2})`}
      />
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

  const catalogElement = getCatalogElement(catalog, item.type);

  let renderedItem = isPlacementPreview
    ? renderPlacementPreview(item, catalogElement, layer, scene)
    : (catalogElement?.render2D
      ? catalogElement.render2D(item, layer, scene)
      : renderPlacementPreview(item, catalogElement, layer, scene));

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
