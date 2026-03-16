import {ElementsFactories} from 'react-planner';
import _wallPng from './wall.png';
import _bricksJpg from './textures/bricks.jpg';
import _bricksNormalJpg from './textures/bricks-normal.jpg';
import _paintedJpg from './textures/painted.jpg';
import _paintedNormalJpg from './textures/painted-normal.jpg';
import _poliigonWoodJpg from './textures/Poliigon_Wood.jpg';
import _poliigonWoodNormalPng from './textures/Poliigon_Wood_Normal.png';
import _plankFlooringJpg from './textures/plank_flooring.jpg';
import _plankFlooringNormalJpg from './textures/plank_flooring_normal.jpg';

const info = {
  title: 'wall',
  tag: ['wall'],
  description: 'Wall with bricks or painted',
  image: _wallPng,
  visibility: {
    catalog: true,
    layerElementsVisible: true
  }
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
    name:'Painted',
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
    name:'Poliigon Wood',
    uri: _poliigonWoodJpg,
    lengthRepeatScale: 0.005,
    heightRepeatScale: 0.005,
    normal: {
      uri: _poliigonWoodNormalPng,
      lengthRepeatScale: 0.005,
      heightRepeatScale: 0.005,
      normalScaleX: 0.8,
      normalScaleY: 0.8
    }},
    plank_flooring: {
    name:'Plank Flooring',
    uri: _plankFlooringJpg,
    lengthRepeatScale: 0.01,
    heightRepeatScale: 0.01,
    normal: {
      uri: _plankFlooringNormalJpg,
      lengthRepeatScale: 0.01,
      heightRepeatScale: 0.01,
      normalScaleX: 0.8,
      normalScaleY: 0.8
    }}

};

export default ElementsFactories.WallFactory('wall', info, textures);

