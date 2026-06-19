import React from 'react';
import Translator from '../../translator/translator';
import * as SharedStyle from '../../shared-style';
import { getWallEdgeMetrics } from './wall-utils';
import {
  buildStructuralLine,
  updatedStructuralLine,
} from './structural-line-factory-3d';

const STYLE_RECT = {
  strokeWidth: 1,
  stroke: SharedStyle.LINE_MESH_COLOR.unselected,
  fill: 'url(#diagonalFill)',
};
const STYLE_RECT_SELECTED = {
  ...STYLE_RECT,
  stroke: SharedStyle.LINE_MESH_COLOR.selected,
};

const translator = new Translator();

export default function StructuralLineFactory(name, info, textures, options = {}) {
  const defaultHeight = options.defaultHeight || 280;
  const defaultThickness = options.defaultThickness || 24;

  const structuralLineElement = {
    name,
    prototype: 'lines',
    info: {
      ...info,
      participatesInAreaDetection: false,
      allowIntersections: false,
      allowsHoles: false,
      heightFromRoom: options.heightFromRoom !== false,
      textureFaceMode: 'four-faces',
    },
    properties: {
      height: {
        label: translator.t('height'),
        type: 'length-measure',
        defaultValue: {
          length: defaultHeight,
        },
      },
      thickness: {
        label: translator.t('width'),
        type: 'length-measure',
        defaultValue: {
          length: defaultThickness,
        },
      },
      ...(options.extraProperties || {}),
    },

    render2D: function (element, layer) {
      const metrics = getWallEdgeMetrics(element, layer);
      if (!metrics) return null;

      const { negativeEdge, positiveEdge } = metrics;
      const points = `${negativeEdge.start},${negativeEdge.y} ${negativeEdge.end},${negativeEdge.y} ${positiveEdge.end},${positiveEdge.y} ${positiveEdge.start},${positiveEdge.y}`;

      return (
        <polygon
          points={points}
          style={element.selected ? STYLE_RECT_SELECTED : STYLE_RECT}
        />
      );
    },

    render3D: function (element, layer, scene) {
      return buildStructuralLine(element, layer, scene, textures, options);
    },

    updateRender3D: (element, layer, scene, mesh, oldElement, differences, selfDestroy, selfBuild) => {
      return updatedStructuralLine(
        element,
        layer,
        scene,
        textures,
        mesh,
        oldElement,
        differences,
        selfDestroy,
        selfBuild,
      );
    },
  };

  structuralLineElement.textures = textures || {};

  if (textures && Object.keys(textures).length > 0) {
    const textureValues = { none: 'None' };
    for (const textureName in textures) {
      textureValues[textureName] = textures[textureName].name;
    }

    structuralLineElement.properties.textureA = {
      label: translator.t('texture') + ' A',
      type: 'enum',
      defaultValue: textureValues.bricks ? 'bricks' : 'none',
      values: textureValues,
    };

    structuralLineElement.properties.textureB = {
      label: translator.t('texture') + ' B',
      type: 'enum',
      defaultValue: textureValues.bricks ? 'bricks' : 'none',
      values: textureValues,
    };
  }

  return structuralLineElement;
}
