import { ElementsFactories } from 'react-planner';
import _columnPng from '../wall/wall.png';
import _bricksJpg from '../wall/textures/bricks.jpg';
import _bricksNormalJpg from '../wall/textures/bricks-normal.jpg';
import _paintedJpg from '../wall/textures/painted.jpg';
import _paintedNormalJpg from '../wall/textures/painted-normal.jpg';
import _poliigonWoodJpg from '../wall/textures/Poliigon_Wood.jpg';
import _poliigonWoodNormalPng from '../wall/textures/Poliigon_Wood_Normal.png';
import _plankFlooringJpg from '../wall/textures/plank_flooring.jpg';
import _plankFlooringNormalJpg from '../wall/textures/plank_flooring_normal.jpg';

const info = {
  title: 'column',
  tag: ['structure', 'column'],
  description: 'Rectangular or square structural column',
  image: _columnPng,
  visibility: {
    catalog: true,
    layerElementsVisible: true
  },
  participatesInAreaDetection: false,
  allowIntersections: false,
  allowsHoles: false,
  textureFaceMode: 'four-faces',
};

const textures = {
  bricks: {
    name: 'Bricks',
    uri: _bricksJpg,
    lengthRepeatScale: 0.01,
    heightRepeatScale: 0.01,
    normal: {
      uri: _bricksNormalJpg,
      lengthRepeatScale: 0.01,
      heightRepeatScale: 0.01,
      normalScaleX: 0.8,
      normalScaleY: 0.8
    }
  },
  painted: {
    name: 'Painted',
    uri: _paintedJpg,
    lengthRepeatScale: 0.01,
    heightRepeatScale: 0.01,
    normal: {
      uri: _paintedNormalJpg,
      lengthRepeatScale: 0.01,
      heightRepeatScale: 0.01,
      normalScaleX: 0.4,
      normalScaleY: 0.4
    }
  },
  Poliigon_Wood: {
    name: 'Poliigon Wood',
    uri: _poliigonWoodJpg,
    lengthRepeatScale: 0.005,
    heightRepeatScale: 0.005,
    normal: {
      uri: _poliigonWoodNormalPng,
      lengthRepeatScale: 0.005,
      heightRepeatScale: 0.005,
      normalScaleX: 0.8,
      normalScaleY: 0.8
    }
  },
  plank_flooring: {
    name: 'Plank Flooring',
    uri: _plankFlooringJpg,
    lengthRepeatScale: 0.01,
    heightRepeatScale: 0.01,
    normal: {
      uri: _plankFlooringNormalJpg,
      lengthRepeatScale: 0.01,
      heightRepeatScale: 0.01,
      normalScaleX: 0.8,
      normalScaleY: 0.8
    }
  }
};

export default ElementsFactories.StructuralLineFactory('column', info, textures, {
  kind: 'column',
  defaultHeight: 280,
  defaultThickness: 40,
});
