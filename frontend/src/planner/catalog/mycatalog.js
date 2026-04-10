import {Catalog} from 'react-planner';

let catalog = new Catalog();

// Helper to convert file path to camelCase key (matching babel-plugin-import-glob naming)
function pathToKey(path, typePrefix) {
  const stripped = path
    .replace(new RegExp(`^\\.\\/${typePrefix}\\/`), '')
    .replace(/\/planner-element\.(jsx|js)$/, '');
  
  const parts = stripped.split('/').filter(Boolean);
  
  return parts.map((part, index) => {
    const camelPart = part.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (index === 0) return camelPart;
    return camelPart.charAt(0).toUpperCase() + camelPart.slice(1);
  }).join('');
}

// Load all planner elements using Vite's import.meta.glob (eager)
const areaModules = import.meta.glob('./areas/**/planner-element.{jsx,js}', { eager: true });
const lineModules = import.meta.glob('./lines/**/planner-element.{jsx,js}', { eager: true });
const holeModules = import.meta.glob('./holes/**/planner-element.{jsx,js}', { eager: true });
const itemModules = import.meta.glob('./items/**/planner-element.{jsx,js}', { eager: true });

// Build lookup objects and register elements
const Areas = {};
const Lines = {};
const Holes = {};
const Items = {};

for (const [path, module] of Object.entries(areaModules)) {
  const key = pathToKey(path, 'areas');
  const element = module.default || module;
  Areas[key] = element;
  catalog.registerElement(element);
}

for (const [path, module] of Object.entries(lineModules)) {
  const key = pathToKey(path, 'lines');
  const element = module.default || module;
  Lines[key] = element;
  catalog.registerElement(element);
}

for (const [path, module] of Object.entries(holeModules)) {
  const key = pathToKey(path, 'holes');
  const element = module.default || module;
  Holes[key] = element;
  catalog.registerElement(element);
}

for (const [path, module] of Object.entries(itemModules)) {
  const key = pathToKey(path, 'items');
  const element = module.default || module;
  Items[key] = element;
  catalog.registerElement(element);
}

// Construction category - doors and windows that snap to walls
catalog.registerCategory('construction', 'Construction', [
  // Doors
  Holes.doorGlassDoubleDoor,
  Holes.doorWoodenNormalDoor,
  // Windows
  Holes.windowOuterMetalWindow,
  Holes.window,
  Holes.windowSashWindow,
  Holes.windowVenetianBlindWindow
]);

// Legacy categories for backward compatibility
catalog.registerCategory('windows', 'Windows', [Holes.window, Holes.windowSashWindow, Holes.windowVenetianBlindWindow, Holes.windowCurtain]);
catalog.registerCategory('doors', 'Doors', [Holes.doorGlassDoubleDoor, Holes.doorWoodenNormalDoor, Holes.gate]);

export default catalog;
