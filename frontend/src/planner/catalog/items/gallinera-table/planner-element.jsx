import * as Three from 'three';
import { loadGLTF, deepCloneWithMaterials } from '../../utils/load-gltf';
import React from 'react';
import convert from 'convert-units';
import _gallineraTablePreviewJpg from './textures/gallinera_table_diff_2k.jpg';
import _gallineraTableGlb from './gallinera-table.glb';

let cached3DGallineraTable = null;

export default {
  name: "gallinera-table",
  prototype: "items",

  info: {
    title: "Gallinera Table",
    tag: ['furniture', 'table'],
    description: "Gallinera style table",
    image: _gallineraTablePreviewJpg // Using diffuse texture as preview
  },

  properties: {
    altitude: {
      label: "Altitude",
      type: "length-measure",
      defaultValue: {
        length: 0
      }
    },
    width: {
      label: "Width",
      type: "length-measure",
      defaultValue: {
        length: 120,
        unit: 'cm'
      }
    },
    depth: {
      label: "Depth", 
      type: "length-measure",
      defaultValue: {
        length: 80,
        unit: 'cm'
      }
    },
    height: {
      label: "Height",
      type: "length-measure",
      defaultValue: {
        length: 75,
        unit: 'cm'
      }
    }
  },

  render2D: function (element, layer, scene) {
    const width = element.properties.get('width').get('length');
    const depth = element.properties.get('depth').get('length');

    const angle = element.rotation + 90;
    const textRotation = Math.sin(angle * Math.PI / 180) < 0 ? 180 : 0;

    const style = {
      stroke: element.selected ? '#0096fd' : '#000',
      strokeWidth: "2px",
      fill: "#84e1ce"
    };

    return (
      <g transform={`translate(${-width / 2},${-depth / 2})`}>
        <rect 
          key="1" 
          x="0" 
          y="0" 
          width={width} 
          height={depth} 
          style={style}
        />
        <text 
          key="2" 
          x="0" 
          y="0" 
          transform={`translate(${width / 2}, ${depth / 2}) scale(1,-1) rotate(${textRotation})`}
          style={{textAnchor: "middle", fontSize: "11px"}}
        >
          {element.type}
        </text>
      </g>
    );
  },

  render3D: function (element, layer, scene) {
    const width = element.properties.get('width');
    const depth = element.properties.get('depth');
    const height = element.properties.get('height');
    const newAltitude = element.properties.get('altitude').get('length');

    const onLoadItem = (object) => {
      // Convert units to scene units
      const newWidth = convert(width.get('length')).from(width.get('unit')).to(scene.unit);
      const newHeight = convert(height.get('length')).from(height.get('unit')).to(scene.unit);
      const newDepth = convert(depth.get('length')).from(depth.get('unit')).to(scene.unit);

      // Selection boxes are managed by viewer3d.updateSelectionBoxes() at scene
      // level so they track the item correctly during drag (no double-transform).

      // Get the bounding box to normalize the object
      const boundingBox = new Three.Box3().setFromObject(object);
      
      const originalWidth = boundingBox.max.x - boundingBox.min.x;
      const originalHeight = boundingBox.max.y - boundingBox.min.y;
      const originalDepth = boundingBox.max.z - boundingBox.min.z;

      // Scale to desired dimensions
      object.scale.set(
        newWidth / originalWidth,
        newHeight / originalHeight,
        newDepth / originalDepth
      );

      // Center the object at origin
      const center = [
        (boundingBox.max.x - boundingBox.min.x) / 2 + boundingBox.min.x,
        (boundingBox.max.y - boundingBox.min.y) / 2 + boundingBox.min.y,
        (boundingBox.max.z - boundingBox.min.z) / 2 + boundingBox.min.z
      ];

      object.position.x -= center[0] * object.scale.x;
      object.position.y -= center[1] * object.scale.y - (boundingBox.max.y - boundingBox.min.y) * object.scale.y / 2;
      object.position.z -= center[2] * object.scale.z;

      // Apply altitude
      object.position.y += newAltitude;

      return object;
    };

    // Load from cache if available - use deep clone to preserve materials/textures
    if (cached3DGallineraTable) {
      return Promise.resolve(onLoadItem(deepCloneWithMaterials(cached3DGallineraTable)));
    }

    // Load the GLB file (self-contained binary GLTF)
    return loadGLTF(_gallineraTableGlb)
      .then(object => {
        cached3DGallineraTable = object;
        return onLoadItem(deepCloneWithMaterials(cached3DGallineraTable));
      });
  }
};
