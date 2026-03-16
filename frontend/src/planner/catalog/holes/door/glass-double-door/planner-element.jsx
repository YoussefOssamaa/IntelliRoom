/**
 * Glass Double Door - GLB-based door element
 * Snaps to walls and creates door openings
 */
import { createGLBDoor } from '../../../utils/glb-hole-factory';
import _glassDoubleDoorGlb from './glass-double-door.glb';
import _glassDoubleDoorPng from './glass-double-door.png';

export default createGLBDoor(
  'glass-double-door',
  'Glass Double Door',
  'Modern glass double door with metal frame',
  ['door', 'glass', 'double', 'construction'],
  _glassDoubleDoorGlb,
  _glassDoubleDoorPng,
  {
    width: { length: 200, unit: 'cm' },
    height: { length: 215, unit: 'cm' },
    thickness: { length: 30, unit: 'cm' },
    altitude: { length: 0, unit: 'cm' }
  }
);

