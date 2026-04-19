import React from 'react';
import { buildWall, updatedWall } from './wall-factory-3d';
import * as SharedStyle from '../../shared-style';
import Translator from '../../translator/translator';
import Ruler from '../../components/viewer2d/ruler';
import { getWallEdgeMetrics } from './wall-utils';

const epsilon = 20;
const STYLE_TEXT = { textAnchor: 'middle' };
const STYLE_LINE = { stroke: SharedStyle.LINE_MESH_COLOR.selected };
const STYLE_RECT = { strokeWidth: 1, stroke: SharedStyle.LINE_MESH_COLOR.unselected, fill: 'url(#diagonalFill)' };
const STYLE_RECT_SELECTED = { ...STYLE_RECT, stroke: SharedStyle.LINE_MESH_COLOR.selected };

let translator = new Translator();

export default function WallFactory(name, info, textures) {

  let wallElement = {
    name,
    prototype: 'lines',
    info,
    properties: {
      height: {
        label: translator.t('height'),
        type: 'length-measure',
        // Height represents the wall portion ABOVE the slab (zero reference is at slab top)
        // Default 280cm = 2.8m wall above the slab
        defaultValue: {
          length: 280,
        }
      },
      thickness: {
        label: translator.t('thickness'),
        type: 'length-measure',
        defaultValue: {
          length: 24
        }
      },
      sideAInside: {
        label: translator.t('Side A Faces Inside'),
        type: 'hidden',
        defaultValue: undefined
      }
    },

    render2D: function (element, layer, scene) {
      const metrics = getWallEdgeMetrics(element, layer);
      if (!metrics) return null;

      const {
        halfThickness,
        negativeEdge,
        positiveEdge,
        innerEdge,
        outerEdge,
      } = metrics;
      const displayedInnerEdge = outerEdge;
      const displayedOuterEdge = innerEdge;
      const half_thickness_eps = halfThickness + epsilon;
      const points = `${negativeEdge.start},${negativeEdge.y} ${negativeEdge.end},${negativeEdge.y} ${positiveEdge.end},${positiveEdge.y} ${positiveEdge.start},${positiveEdge.y}`;
      const rulerOffset = halfThickness + 18;
      const innerRulerY = displayedInnerEdge.side === 'negative' ? -rulerOffset : rulerOffset;
      const outerRulerY = displayedOuterEdge.side === 'negative' ? -rulerOffset : rulerOffset;

      return (element.selected) ?
        <g>
          <polygon points={points} style={STYLE_RECT_SELECTED} />
          <line x1={metrics.length / 5} y1={-half_thickness_eps} x2={metrics.length / 5} y2={half_thickness_eps} style={STYLE_LINE} />
          <Ruler unit={scene.unit} length={displayedInnerEdge.length} transform={`translate(${displayedInnerEdge.start}, ${innerRulerY})`} />
          <Ruler unit={scene.unit} length={displayedOuterEdge.length} transform={`translate(${displayedOuterEdge.start}, ${outerRulerY})`} />
        </g> :
        <polygon points={points} style={STYLE_RECT} />
    },

    render3D: function (element, layer, scene) {
      return buildWall(element, layer, scene, textures);
    },

    updateRender3D: (element, layer, scene, mesh, oldElement, differences, selfDestroy, selfBuild) => {
      return updatedWall(element, layer, scene, textures, mesh, oldElement, differences, selfDestroy, selfBuild);
    }

  };

  // Store raw textures on element for sidebar access
  wallElement.textures = textures || {};

  if (textures && Object.keys(textures).length > 0) {

    let textureValues = { 'none': 'None' };

    for (let textureName in textures) {
      textureValues[textureName] = textures[textureName].name;
    }

    wallElement.properties.textureA = {
      label: translator.t('texture') + ' A',
      type: 'enum',
      defaultValue: textureValues.bricks ? 'bricks' : 'none',
      values: textureValues
    };

    wallElement.properties.textureB = {
      label: translator.t('texture') + ' B',
      type: 'enum',
      defaultValue: textureValues.bricks ? 'bricks' : 'none',
      values: textureValues
    };

  }

  return wallElement;
}
