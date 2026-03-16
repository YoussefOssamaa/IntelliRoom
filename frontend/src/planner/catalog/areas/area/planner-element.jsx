import {ElementsFactories} from 'react-planner';
import _parquetJpg from './textures/parquet.jpg';
import _tile1Jpg from './textures/tile1.jpg';
import _ceramicTileJpg from './textures/ceramic-tile.jpg';
import _strandPorcelainJpg from './textures/strand-porcelain.jpg';
import _grassJpg from './textures/grass.jpg';
import _blackStonesTiledFloorJpg from './textures/black-stones-tiled-floor.jpg';

let info = {
  title: 'area',
  tag: ['area'],
  description: 'Generic Room',
  image: ''
};

let textures = {
  parquet: {
    name: 'Parquet',
    uri: _parquetJpg,
    lengthRepeatScale: 0.004,
    heightRepeatScale: 0.004,
  },
  tile1: {
    name: 'Tile1',
    uri: _tile1Jpg,
    lengthRepeatScale: 0.01,
    heightRepeatScale: 0.01,
  },
  ceramic: {
    name:'Ceramic Tile',
    uri: _ceramicTileJpg,
    lengthRepeatScale: 0.02,
    heightRepeatScale: 0.02
  },
  strand_porcelain: {
    name:'Strand Porcelain Tile',
    uri: _strandPorcelainJpg,
    lengthRepeatScale: 0.02,
    heightRepeatScale: 0.02
  },
  grass: {
    name: 'Grass',
    uri: _grassJpg,
    lengthRepeatScale: 0.01,
    heightRepeatScale: 0.01,
  },
  black_stones_tiled_floor: {
    name: 'Black stones tiled floor',
    uri: _blackStonesTiledFloorJpg,
    lengthRepeatScale: 0.02,
    heightRepeatScale: 0.02
  }
};

export default ElementsFactories.AreaFactory('area', info, textures);
