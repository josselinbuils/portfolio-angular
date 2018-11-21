import { fillProperties } from '../helpers/model-helpers';

// All vectors are in LPS space
export class Volume {
  corners: {
    x0y0z0: number[];
    x1y0z0: number[];
    x1y1z0: number[];
    x0y1z0: number[];
    x0y0z1: number[];
    x1y0z1: number[];
    x1y1z1: number[];
    x0y1z1: number[];
  };
  // mm
  dimensionsMm: number[];
  // Voxels
  dimensionsVoxels: number[];
  firstVoxelCenter: number[];
  // Unit vectors
  orientation: number[][];
  // Orientation vectors scaled with volume dimensions in mm
  orientedDimensionsMm: number[][];
  // Orientation vectors scaled with volume dimensions in voxels
  orientedDimensionsVoxels: number[][];
  // mm
  voxelSpacing: number[];

  constructor(config: object) {
    fillProperties(this, config);
  }
}
