import React from 'react';
import { buildWall, updatedWall } from './wall-factory-3d';
import * as SharedStyle from '../../shared-style';
import * as Geometry from '../../utils/geometry';
import Translator from '../../translator/translator';

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
      let vertex0 = layer.vertices.get(element.vertices.get(0));
      let vertex1 = layer.vertices.get(element.vertices.get(1));
      let { x: x1, y: y1 } = vertex0;
      let { x: x2, y: y2 } = vertex1;

      let length = Geometry.pointsDistance(x1, y1, x2, y2);
      let length_5 = length / 5;

      let thickness = element.getIn(['properties', 'thickness', 'length']);
      let half_thickness = thickness / 2;
      let half_thickness_eps = half_thickness + epsilon;
      let char_height = 11;
      let extra_epsilon = 5;
      let textDistance = half_thickness + epsilon + extra_epsilon;

      // Calculate miter offsets for corners
      let miter0 = { extend: 0, side: 0 };
      let miter1 = { extend: 0, side: 0 };

      // Check vertex0 for adjacent walls - only miter when exactly 2 walls meet
      if (vertex0.lines && vertex0.lines.size === 2) {
        const otherLineID = vertex0.lines.find(id => id !== element.id);
        if (otherLineID) {
          const otherLine = layer.lines.get(otherLineID);
          if (otherLine) {
            const otherV0 = layer.vertices.get(otherLine.vertices.get(0));
            const otherV1 = layer.vertices.get(otherLine.vertices.get(1));
            const adjacentVertex = otherV0.id === vertex0.id ? otherV1 : otherV0;
            
            const wallAngle = Math.atan2(y2 - y1, x2 - x1);
            const adjAngle = Math.atan2(adjacentVertex.y - vertex0.y, adjacentVertex.x - vertex0.x);
            let angleDiff = adjAngle - wallAngle;
            
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            if (Math.abs(angleDiff) > 0.01 && Math.abs(Math.abs(angleDiff) - Math.PI) > 0.01) {
              const extension = half_thickness / Math.tan(Math.abs(angleDiff / 2));
              miter0 = { extend: Math.abs(extension), side: angleDiff > 0 ? 1 : -1 };
            }
          }
        }
      }

      // Check vertex1 for adjacent walls - only miter when exactly 2 walls meet
      if (vertex1.lines && vertex1.lines.size === 2) {
        const otherLineID = vertex1.lines.find(id => id !== element.id);
        if (otherLineID) {
          const otherLine = layer.lines.get(otherLineID);
          if (otherLine) {
            const otherV0 = layer.vertices.get(otherLine.vertices.get(0));
            const otherV1 = layer.vertices.get(otherLine.vertices.get(1));
            const adjacentVertex = otherV0.id === vertex1.id ? otherV1 : otherV0;
            
            const wallAngle = Math.atan2(y2 - y1, x2 - x1) + Math.PI;
            const adjAngle = Math.atan2(adjacentVertex.y - vertex1.y, adjacentVertex.x - vertex1.x);
            let angleDiff = adjAngle - wallAngle;
            
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            if (Math.abs(angleDiff) > 0.01 && Math.abs(Math.abs(angleDiff) - Math.PI) > 0.01) {
              const extension = half_thickness / Math.tan(Math.abs(angleDiff / 2));
              miter1 = { extend: Math.abs(extension), side: -(angleDiff > 0 ? 1 : -1) };
            }
          }
        }
      }

      // Create polygon points for mitered wall
      // The wall is rendered as a horizontal rectangle from (0,0) to (length,0)
      // Y axis: -half_thickness (bottom/inner) to +half_thickness (top/outer)
      // miter.side > 0: outer edge (+Y) extends, inner edge (-Y) shortens
      // miter.side < 0: inner edge (-Y) extends, outer edge (+Y) shortens
      
      let x0_inner = 0;  // Start X at inner edge (Y = -half_thickness)
      let x0_outer = 0;  // Start X at outer edge (Y = +half_thickness)
      let x1_inner = length;  // End X at inner edge
      let x1_outer = length;  // End X at outer edge
      
      // Apply miter0 (start vertex)
      if (miter0.extend > 0) {
        if (miter0.side > 0) {
          // Outer edge extends backward (negative X), inner edge shortens forward (positive X)
          x0_outer = miter0.extend;
          x0_inner = -miter0.extend;
        } else {
          // Inner edge extends backward, outer edge shortens forward
          x0_inner = miter0.extend;
          x0_outer = -miter0.extend;
        }
      }
      
      // Apply miter1 (end vertex)
      if (miter1.extend > 0) {
        if (miter1.side > 0) {
          // Outer edge extends forward, inner edge shortens backward
          x1_outer = length - miter1.extend;
          x1_inner = length + miter1.extend;
        } else {
          // Inner edge extends forward, outer edge shortens backward
          x1_inner = length - miter1.extend;
          x1_outer = length + miter1.extend;
        }
      }

      const points = `${x0_inner},${-half_thickness} ${x1_inner},${-half_thickness} ${x1_outer},${half_thickness} ${x0_outer},${half_thickness}`;

      return (element.selected) ?
        <g>
          <polygon points={points} style={STYLE_RECT_SELECTED} />
          <line x1={length_5} y1={-half_thickness_eps} x2={length_5} y2={half_thickness_eps} style={STYLE_LINE} />

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
