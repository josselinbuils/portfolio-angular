import { V } from '../math';
import { convert } from '../utils/coordinates';

import { Camera } from './camera';
import { Dataset } from './dataset';
import { Model } from './model';

const MANDATORY_FIELDS = [
  'corners', 'dimensionsMm', 'dimensionsVoxels', 'displayRatio', 'firstVoxelCenter', 'orientation',
  'orientedDimensionsMm', 'orientedDimensionsVoxels', 'voxelSpacing',
];

// All vectors are in LPS space
export class Volume extends Model {
  corners!: {
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
  dimensionsMm!: number[];
  // Voxels
  dimensionsVoxels!: number[];
  displayRatio!: number[];
  firstVoxelCenter!: number[];
  // Unit vectors
  orientation!: number[][];
  // Orientation vectors scaled with volume dimensions in mm
  orientedDimensionsMm!: number[][];
  // Orientation vectors scaled with volume dimensions in voxels
  orientedDimensionsVoxels!: number[][];
  // mm
  voxelSpacing!: number[];

  constructor(config: object) {
    super();
    super.fillProperties(config);
    super.checkMandatoryFieldsPresence(MANDATORY_FIELDS);
  }

  getOrientedDimensionMm(axe: number[]): number {
    return Math.max(
      ...this.orientedDimensionsMm.map(dimensionVector => Math.abs(V(dimensionVector).dot(axe))),
    );
  }

  // TODO Optimize this
  getImageDimensions(dataset: Dataset, camera: Camera): {
    fieldOfView: number; height: number; heightRatio: number; width: number; widthRatio: number;
  } {
    // Compute volume limits in computer service
    const basis = camera.getWorldBasis();
    const halfSpacing = V(this.voxelSpacing).mul(0.5);
    const halfHorizontalSpacing = Math.abs(halfSpacing.dot(basis[0]));
    const halfVerticalSpacing = Math.abs(halfSpacing.dot(basis[1]));

    let minHorizontal = Number.MAX_SAFE_INTEGER;
    let maxHorizontal = -Number.MAX_SAFE_INTEGER;
    let maxVertical = -Number.MAX_SAFE_INTEGER;
    let minVertical = Number.MAX_SAFE_INTEGER;
    let maxHorizontalMm = -Number.MAX_SAFE_INTEGER;
    let minHorizontalMm = Number.MAX_SAFE_INTEGER;
    let maxVerticalMm = -Number.MAX_SAFE_INTEGER;
    let minVerticalMm = Number.MAX_SAFE_INTEGER;

    Object.values(this.corners)
      .forEach(corner => {
        const left = V(corner).dot(basis[0]) / V(this.voxelSpacing).dot(basis[0]);
        const top = V(corner).dot(basis[1]) / V(this.voxelSpacing).dot(basis[1]);
        const cornerCamera = convert(corner, dataset, camera, dataset) as number[];
        const leftMm = cornerCamera[0];
        const topMm = cornerCamera[1];

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
        if (leftMm < minHorizontalMm) {
          minHorizontalMm = leftMm - halfHorizontalSpacing;
        }
        if (leftMm > maxHorizontalMm) {
          maxHorizontalMm = leftMm + halfHorizontalSpacing;
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
    const widthMm = Math.round(maxHorizontalMm - minHorizontalMm);
    const heightMm = Math.round(maxVerticalMm - minVerticalMm);

    // Height is the reference
    const widthRatio = 1 / ((width / height) * (heightMm / widthMm));
    const heightRatio = 1;
    const fieldOfView = heightMm;

    return { fieldOfView, height, heightRatio, width, widthRatio };
  }
}
