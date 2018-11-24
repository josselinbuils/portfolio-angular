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

  getOrientedDimensionMm(axe: number[]): number {
    return Math.max(
      ...this.orientedDimensionsMm.map(dimensionVector => Math.abs(math.dot(dimensionVector, axe))),
    );
  }

  // Provides dimensions in pixels, works only with canonical orientations
  getSliceDimensions(basis: number[][]): { height: number; heightRatio: number; width: number; widthRatio: number } {
    let width = 0;
    let widthRatio = 1;
    let height = 0;
    let heightRatio = 1;

    this.orientedDimensionsVoxels.forEach(orientedDimension => {
      const potentialWidth = math.chain(orientedDimension).dot(basis[0]).abs().round().done();
      const potentialHeight = math.chain(orientedDimension).dot(basis[1]).abs().round().done();

      if (potentialWidth > width) {
        width = potentialWidth;
        widthRatio = math.chain(this.displayRatio).dot(basis[0].map(Math.abs)).done();
      }
      if (potentialHeight > height) {
        height = potentialHeight;
        heightRatio = math.chain(this.displayRatio).dot(basis[1].map(Math.abs)).done();
      }
    });

    // Height is the reference
    widthRatio /= heightRatio;
    heightRatio = 1;

    return { height, heightRatio, width, widthRatio };
  }
}
