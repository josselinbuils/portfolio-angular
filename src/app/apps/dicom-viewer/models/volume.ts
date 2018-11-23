import { math } from '../helpers/maths-helpers';

import { Model } from './model';

// All vectors are in LPS space
export class Volume extends Model {
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
  displayRatio: number[];
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
    super();
    super.fillProperties(this, config);
  }

  // Provides dimensions in pixels, works only with canonical orientations
  getSliceDimensions(basis: number[][]): { height: number; heightRatio: number; width: number; widthRatio: number } {
    let width: number;
    let widthRatio: number;
    let height: number;
    let heightRatio: number;

    this.orientedDimensionsVoxels.forEach((orientedDimension, index) => {
      const potentialWidth = math.chain(orientedDimension).dot(basis[0]).abs().round().done();
      const potentialHeight = math.chain(orientedDimension).dot(basis[1]).abs().round().done();

      if (width === undefined || potentialWidth > width) {
        width = potentialWidth;
        widthRatio = this.displayRatio[index];
      }
      if (height === undefined || potentialHeight > height) {
        height = potentialHeight;
        heightRatio = this.displayRatio[index];
      }
    });

    // noinspection JSUnusedAssignment
    return { height, heightRatio, width, widthRatio };
  }
}
