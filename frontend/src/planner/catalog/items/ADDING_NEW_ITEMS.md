# Adding New GLB/GLTF Items

This guide explains how to add new 3D items to the planner using the `GLBItemFactory`.

## Quick Start

### Option 1: Simple GLB Item (Single .glb file + .png preview)

1. Create a folder in `demo/src/catalog/items/` with your item name (e.g., `my-new-chair`)
2. Add your files:
   - `my-new-chair.glb` - The 3D model
   - `my-new-chair.png` - Preview image for the catalog
3. Create `planner-element.jsx`:

```jsx
import { createSimpleGLBItem } from '../../utils/glb-item-factory.jsx';

const glbFile = require('./my-new-chair.glb');
const pngFile = require('./my-new-chair.png');

export default createSimpleGLBItem(
  'my-new-chair',           // unique name (use folder name)
  'My New Chair',           // display title
  'A comfortable chair',    // description
  ['furniture', 'chair'],   // tags for categorization
  glbFile,                  // GLB model
  pngFile,                  // preview image
  {
    width: { length: 60, unit: 'cm' },
    depth: { length: 60, unit: 'cm' },
    height: { length: 90, unit: 'cm' }
  },
  // Optional: Material adjustments for brightness
  {
    emissiveIntensity: 0.5  // Increase if model appears too dark (0-1)
  }
);
```

### Option 2: Complex GLTF Item (.gltf + .bin + textures folder)

1. Create a folder in `demo/src/catalog/items/` with your item name
2. Add your files:
   - `my-item.gltf` - The GLTF file
   - `my-item.bin` - Binary data file
   - `textures/` - Folder containing texture images
   - `preview.png` - Preview image for the catalog
3. Create `planner-element.jsx`:

```jsx
import { createComplexGLTFItem } from '../../utils/glb-item-factory.jsx';

// Import all required files so webpack bundles them
const gltfFile = require('./my-item.gltf');
require('./my-item.bin');  // Ensure bin is bundled
require('./textures/diffuse.jpg');  // Ensure textures are bundled
require('./textures/normal.jpg');

const previewImage = require('./preview.png');

export default createComplexGLTFItem(
  'my-item',
  'My Item',
  'Description of my item',
  ['furniture', 'category'],
  gltfFile,
  previewImage,
  {
    width: { length: 100, unit: 'cm' },
    depth: { length: 80, unit: 'cm' },
    height: { length: 75, unit: 'cm' }
  }
);
```

## Advanced Usage with GLBItemFactory

For more control, use `GLBItemFactory` directly:

```jsx
import GLBItemFactory from '../../utils/glb-item-factory.jsx';

const glbFile = require('./my-item.glb');
const pngFile = require('./my-item.png');

export default GLBItemFactory({
  name: 'my-item',
  info: {
    title: 'My Item',
    tag: ['furniture', 'custom'],
    description: 'A custom item with advanced options',
    image: pngFile
  },
  modelFile: glbFile,
  size: {
    width: { length: 100, unit: 'cm' },
    depth: { length: 80, unit: 'cm' },
    height: { length: 75, unit: 'cm' }
  },
  // Optional: Add custom properties
  properties: {
    color: {
      label: 'Color',
      type: 'enum',
      defaultValue: 'brown',
      values: {
        brown: 'Brown',
        black: 'Black',
        white: 'White'
      }
    }
  },
  // Optional: Custom 2D style
  style2D: {
    fill: '#8B4513'  // Custom fill color
  },
  // Optional: Material adjustments to fix lighting issues
  materialAdjustments: {
    emissiveIntensity: 0.3,  // Increase if model appears too dark (0-1)
    enableShadows: true       // Enable shadow casting/receiving
  }
});
```

## File Structure Example

```
demo/src/catalog/items/
├── my-simple-item/
│   ├── my-simple-item.glb
│   ├── my-simple-item.png
│   └── planner-element.jsx
│
├── my-complex-item/
│   ├── my-complex-item.gltf
│   ├── my-complex-item.bin
│   ├── preview.png
│   ├── textures/
│   │   ├── diffuse.jpg
│   │   ├── normal.jpg
│   │   └── roughness.jpg
│   └── planner-element.jsx
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | Unique identifier for the item |
| `info.title` | string | Yes | Display name in the catalog |
| `info.tag` | string[] | Yes | Tags for categorization |
| `info.description` | string | No | Item description |
| `info.image` | require() | Yes | Preview image |
| `modelFile` | require() | Yes | GLB or GLTF file |
| `size.width` | object | Yes | `{ length: number, unit: 'cm' | 'm' | 'in' }` |
| `size.depth` | object | Yes | Same as width |
| `size.height` | object | Yes | Same as width |
| `properties` | object | No | Additional custom properties |
| `style2D.fill` | string | No | Fill color for 2D view |
| `render2DCustom` | function | No | Custom 2D render function |

## Notes

- The item will automatically be registered in the catalog due to the glob import in `mycatalog.js`
- The GLB/GLTF loader handles both simple and complex files automatically
- Models are cached after first load for better performance
- The 3D model is automatically scaled to fit the specified dimensions
- Altitude (height above floor) is adjustable in the properties panel

### Troubleshooting

**Model appears too dark in 3D view:**
The factory automatically enhances materials with emissive lighting and proper texture color space. If your model still appears too dark:

1. **Increase emissive intensity** (default is 0.4, try 0.5-0.7 for very dark models):
   ```jsx
   export default createSimpleGLBItem(
     // ... other parameters
     {
       emissiveIntensity: 0.6  // Higher value = brighter
     }
   );
   ```

2. **Check your Blender export settings:**
   - Ensure materials are properly set up
   - Use "glTF Binary (.glb)" export format
   - In export options, enable "Compression" if file size is large
   - Check that textures are embedded or exported with the model

3. **Texture color space issues:**
   - The factory automatically sets diffuse/albedo textures to sRGB color space
   - Normal, roughness, and metalness maps remain in linear space
   - If textures still look wrong, verify they're properly embedded in the GLB file

4. **Material adjustments made by the factory:**
   - Minimum roughness set to 0.3 (prevents pure black surfaces)
   - Emissive color added based on base color
   - All texture maps properly configured with color space
   - Shadow casting/receiving enabled by default

Example for very dark models:
```jsx
export default createSimpleGLBItem(
  'my-dark-model',
  'My Dark Model',
  'Description',
  ['furniture'],
  require('./my-dark-model.glb'),
  require('./preview.png'),
  { width: { length: 100, unit: 'cm' }, depth: { length: 80, unit: 'cm' }, height: { length: 75, unit: 'cm' } },
  { emissiveIntensity: 0.7 }  // Much brighter
);
```
