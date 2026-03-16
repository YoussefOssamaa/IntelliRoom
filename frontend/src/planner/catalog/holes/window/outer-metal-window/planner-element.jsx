/**
 * Outer Metal Window - GLB-based window element
 * Snaps to walls and creates window openings
 */
import { createGLBWindow } from '../../../utils/glb-hole-factory';
import _outerMetalWindowGlb from './outer-metal-window.glb';
import _outerMetalWindowPng from './outer-metal-window.png';

export default createGLBWindow(
  'outer-metal-window',
  'Metal Window',
  'Modern outer metal frame window',
  ['window', 'metal', 'construction'],
  _outerMetalWindowGlb,
  _outerMetalWindowPng,
  {
    width: { length: 120, unit: 'cm' },
    height: { length: 100, unit: 'cm' },
    thickness: { length: 20, unit: 'cm' },
    altitude: { length: 90, unit: 'cm' } // 90cm above slab (typical window height)
  }
);
