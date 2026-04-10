import * as Three from 'three';
import { TextGeometry } from 'three-stdlib';
import { List } from 'immutable';
import { COLORS } from '../../../shared-style';

export default function (width, height, grid, font) {
  let step = grid.properties.get('step');
  let colors = grid.properties.has('color') ? new List([grid.properties.get('color')]) : grid.properties.get('colors');

  let streak = new Three.Object3D();
  streak.name = 'streak';

  let counter = 0;

  for (let i = 0; i <= width; i += step) {

    let geometry = new Three.BufferGeometry().setFromPoints([
      new Three.Vector3(i, 0, 0),
      new Three.Vector3(i, 0, -height)
    ]);
    let color = colors.get(counter % colors.size);
    let material = new Three.LineBasicMaterial({ color, transparent: true, opacity: 0.05 });

    streak.add(new Three.LineSegments(geometry, material));
    counter++;
  }
  return streak;
}
