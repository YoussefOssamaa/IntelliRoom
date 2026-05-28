import React from 'react';
import { createArea, updatedArea } from './area-factory-3d';
import * as SharedStyle from '../../shared-style';
import Translator from '../../translator/translator';
import { computeInsetPolygon } from './area-utils';
import { resolvePlannerTextureDefinition } from '../utils/cloud-texture-registry';

let translator = new Translator();

export default function AreaFactory(name, info, textures) {

  let areaElement = {
    name,
    prototype: 'areas',
    info: {
      ...info,
      visibility: {
        catalog: false,
        layerElementsVisible: false
      }
    },
    properties: {
      thickness: {
        label: translator.t('thickness'),
        type: 'length-measure',
        defaultValue: {
          length: 0,
        }
      },
      floorThickness: {
        label: translator.t('Floor Thickness'),
        type: 'length-measure',
        defaultValue: {
          length: 20,
          unit: 'cm'
        }
      },
      roomHeight: {
        label: translator.t('Room Height'),
        type: 'length-measure',
        defaultValue: {
          length: 280,
          unit: 'cm'
        }
      },
      areaSize: {
        label: translator.t('Floor Area'),
        type: 'read-only',
        defaultValue: '',
      },
    },
    render2D: function (element, layer, scene) {
      // Gather raw vertices with their IDs so the inset algorithm can
      // match each polygon edge to its wall in the layer.
      const rawVerts = [];
      element.vertices.forEach(vertexID => {
        const vertex = layer.vertices.get(vertexID);
        rawVerts.push({ x: vertex.x, y: vertex.y, id: vertex.id || vertexID });
      });

      // Offset each edge inward by the half-thickness of the bordering wall.
      const insetVerts = computeInsetPolygon(rawVerts, layer);

      // Build the SVG path from inset vertices
      let path = '';
      insetVerts.forEach((v, ind) => {
        path += (ind ? 'L' : 'M') + v.x + ' ' + v.y + ' ';
      });

      // Add interior holes (not inset — they stay at wall-centre coords)
      element.holes.forEach(areaID => {
        let area = layer.areas.get(areaID);
        area.vertices.reverse().forEach((vertexID, ind) => {
          let vertex = layer.vertices.get(vertexID);
          path += (ind ? 'L' : 'M') + vertex.x + ' ' + vertex.y + ' ';
        });
      });

      // Show applied texture as a tiled SVG pattern in 2D
      const textureKey = element.properties.get ? element.properties.get('texture') : element.properties.texture;
      const textureData =
        textureKey &&
        textureKey !== 'none' &&
        resolvePlannerTextureDefinition(textureKey, {
          targetType: 'floor',
          fallbackTextures: areaElement.textures || textures,
        });

      if (textureKey && textureKey !== 'none' && !textureData) {
        console.error('[PlannerTextures][Trace] Failed to resolve 2D floor texture', {
          textureKey,
          areaId: element.id,
        });
      }

      if (textureData) {
        // Convert lengthRepeatScale to tile size in scene units:
        // e.g. scale=0.004 → 1/0.004 = 250 scene-units per repeat
        const repeatScale =
          textureData.lengthRepeatScale ||
          textureData.rendering?.lengthRepeatScale ||
          0.01;
        const tileSize = Math.max(24, Math.round(1 / repeatScale));
        const patternId = `area-tex-${String(element.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        const textureImage =
          textureData.thumbnailUrl || textureData.uri || textureData.maps?.Color;

        return (
          <g>
            <defs>
              <pattern id={patternId} patternUnits="userSpaceOnUse" width={tileSize} height={tileSize}>
                <image href={textureImage} x="0" y="0" width={tileSize} height={tileSize} preserveAspectRatio="xMidYMid slice" />
              </pattern>
            </defs>
            <path d={path} fill={`url(#${patternId})`} />
            {element.selected && (
              <path
                d={path}
                fill="none"
                stroke={SharedStyle.AREA_MESH_COLOR.selected}
                strokeWidth="6"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        );
      }

      // No texture selected — neutral light floor colour
      return (
        <path
          d={path}
          fill={element.selected ? SharedStyle.AREA_MESH_COLOR.selected : '#f0ede8'}
        />
      );
    },

    render3D: function (element, layer, scene) {
      return createArea(element, layer, scene, areaElement.textures || textures)
    },

    updateRender3D: (element, layer, scene, mesh, oldElement, differences, selfDestroy, selfBuild) => {
      return updatedArea(element, layer, scene, areaElement.textures || textures, mesh, oldElement, differences, selfDestroy, selfBuild);
    }

  };

  // Store raw textures on element for sidebar access
  areaElement.textures = textures || {};

  if (textures && Object.keys(textures).length > 0) {

    let textureValues = { 'none': 'None' };

    for (let textureName in textures) {
      textureValues[textureName] = textures[textureName].name
    }

    areaElement.properties.texture = {
      label: translator.t('Finishes'),
      type: 'enum',
      defaultValue: 'none',
      values: textureValues
    };

  }

  return areaElement

}
