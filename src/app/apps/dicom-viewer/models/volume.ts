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

  // TODO Optimize this
  getSliceDimensions(basis: number[][]): {
    fieldOfView: number; height: number; heightRatio: number; width: number; widthRatio: number;
  } {
    // Compute volume limits in computer service
    const halfVerticalSpacing = math.chain(this.voxelSpacing).multiply(0.5).dot(basis[1]).abs().done();

    let minHorizontal: number = Number.MAX_SAFE_INTEGER;
    let maxHorizontal: number = -Number.MAX_SAFE_INTEGER;
    let maxVertical: number = -Number.MAX_SAFE_INTEGER;
    let minVertical: number = Number.MAX_SAFE_INTEGER;
    let maxVerticalMm: number = -Number.MAX_SAFE_INTEGER;
    let minVerticalMm: number = Number.MAX_SAFE_INTEGER;

    Object.values(this.corners).forEach(corner => {
      const left = math.chain(corner).dotDivide(this.voxelSpacing).dot(basis[0]).done();
      const top = math.chain(corner).dotDivide(this.voxelSpacing).dot(basis[1]).done();
      const topMm = math.chain(corner).dot(basis[1]).done();

      if (left < minHorizontal) {
        minHorizontal = left - 0.5;
      }
      if (left > maxHorizontal) {
        maxHorizontal = left + 0.5;
      }
      if (top < minVertical) {
        minVertical = top - 0.5;
      }
      if (top > maxVertical) {
        maxVertical = top + 0.5;
      }
      if (topMm < minVerticalMm) {
        minVerticalMm = topMm - halfVerticalSpacing;
      }
      if (topMm > maxVerticalMm) {
        maxVerticalMm = topMm + halfVerticalSpacing;
      }
    });

    const width = Math.round(maxHorizontal - minHorizontal);
    const height = Math.round(maxVertical - minVertical);
    const fieldOfView = Math.round(maxVerticalMm - minVerticalMm);

    let heightRatio = math.chain(this.displayRatio).dot(basis[1].map(Math.abs)).done();
    let widthRatio = math.chain(this.displayRatio).dot(basis[0].map(Math.abs)).done();

    // Height is the reference
    widthRatio /= heightRatio;
    heightRatio = 1;

    return { fieldOfView, height, heightRatio, width, widthRatio };
  }
}
