import { math } from '../utils/math';

import { CoordinateSpace } from './coordinate-space';
import { Frame } from './frame';
import { Model } from './model';
import { Volume } from './volume';

const MANDATORY_FIELDS = ['frames', 'voxelSpacing'];

export class Dataset extends Model implements CoordinateSpace {
  frames!: Frame[];
  is3D: boolean;
  volume?: Volume;

  // Shared properties (needed in both 2D/3D)
  voxelSpacing!: number[];

  constructor(config: any) {
    super();
    super.fillProperties(config);
    super.checkMandatoryFieldsPresence(MANDATORY_FIELDS);
    this.is3D = this.volume !== undefined;
  }

  destroy(): void {
    this.frames.forEach(frame => delete frame.pixelData);
  }

  findClosestFrame(point: number[]): Frame {
    const { imagePosition, imageNormal, spacingBetweenSlices } = this.frames[0];

    const index = math.chain(point)
      .subtract(imagePosition)
      .dot(imageNormal)
      .divide(spacingBetweenSlices)
      .round()
      .done();

    if (index < 0 || index >= this.frames.length) {
      const formattedPoint = JSON.stringify(point.map(c => Math.round(c * 1000) / 1000));
      throw new Error(`Unable to find a frame on which the point ${formattedPoint} is`);
    }

    return this.frames[index];
  }

  fromWorld(): number[][] {
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
  }

  getWorldBasis(): number[][] {
    return [...this.frames[0].imageOrientation, this.frames[0].imageNormal];
  }

  getLimitsAlongAxe(axe: number[]): {
    max: { point: number[]; positionOnAxe: number };
    min: { point: number[]; positionOnAxe: number };
  } {
    let maxPoint: number[] | undefined;
    let minPoint: number[] | undefined;
    let maxPositionOnAxe: number | undefined;
    let minPositionOnAxe: number | undefined;

    if (this.is3D) {
      if (this.volume === undefined) {
        throw new Error('Volume undefined');
      }

      maxPositionOnAxe = -Number.MAX_SAFE_INTEGER;
      minPositionOnAxe = Number.MAX_SAFE_INTEGER;

      for (const corner of Object.values(this.volume.corners)) {
        const positionAlongAxe = math.dot(corner, axe);

        if (positionAlongAxe > maxPositionOnAxe) {
          maxPoint = corner.slice();
          maxPositionOnAxe = positionAlongAxe;
        }
        if (positionAlongAxe < minPositionOnAxe) {
          minPoint = corner.slice();
          minPositionOnAxe = positionAlongAxe;
        }
      }
    } else {
      const firstFrame = this.frames[0];
      const lastFrame = this.frames[this.frames.length - 1];

      maxPoint = lastFrame.imagePosition;
      maxPositionOnAxe = math.dot(maxPoint, axe);

      minPoint = firstFrame.imagePosition;
      minPositionOnAxe = math.dot(minPoint, axe);
    }

    return {
      max: {
        point: maxPoint as number[],
        positionOnAxe: maxPositionOnAxe,
      },
      min: {
        point: minPoint as number[],
        positionOnAxe: minPositionOnAxe,
      },
    };
  }

  getWorldOrigin(): number[] {
    return this.frames[0].imagePosition;
  }

  toWorld(): number[][] {
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
  }
}
