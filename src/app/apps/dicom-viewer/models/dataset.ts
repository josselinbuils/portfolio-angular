import { math } from '../helpers/maths-helpers';

import { Frame } from './frame';
import { Model } from './model';
import { Volume } from './volume';

export class Dataset extends Model {
  frames: Frame[];
  is3D: boolean;
  volume?: Volume;

  // Shared properties (needed in both 2D/3D)
  voxelSpacing: number[];

  constructor(config: any) {
    super();
    super.fillProperties(this, config);
    this.is3D = this.volume !== undefined;
  }

  destroy(): void {
    this.frames.forEach(frame => delete frame.pixelData);
  }

  findClosestFrame(point: number[]): Frame {
    const { imagePosition, imageNormal } = this.frames[0];

    const index = math.chain(point)
      .subtract(imagePosition)
      .dotDivide(this.voxelSpacing)
      .dot(imageNormal)
      .round()
      .done();

    if (index < 0 || index >= this.frames.length) {
      const formattedPoint = JSON.stringify(point.map(c => Math.round(c * 1000) / 1000));
      throw new Error(`Unable to find a frame on which the point ${formattedPoint} is`);
    }

    return this.frames[index];
  }

  getLimitsAlongAxe(axe: number[]): {
    max: { point: number[]; positionOnAxe: number };
    min: { point: number[]; positionOnAxe: number };
  } {
    const limits = {
      max: { point: undefined, positionOnAxe: undefined },
      min: { point: undefined, positionOnAxe: undefined },
    };

    if (this.is3D) {
      limits.max.positionOnAxe = -Number.MAX_SAFE_INTEGER;
      limits.min.positionOnAxe = Number.MAX_SAFE_INTEGER;

      for (const corner of Object.values(this.volume.corners)) {
        const positionAlongAxe = math.dot(corner, axe);

        if (positionAlongAxe > limits.max.positionOnAxe) {
          limits.max.positionOnAxe = positionAlongAxe;
          limits.max.point = corner.slice();
        }
        if (positionAlongAxe < limits.min.positionOnAxe) {
          limits.min.positionOnAxe = positionAlongAxe;
          limits.min.point = corner.slice();
        }
      }
    } else {
      const firstFrame = this.frames[0];
      const lastFrame = this.frames[this.frames.length - 1];

      limits.max.point = lastFrame.imagePosition;
      limits.max.positionOnAxe = math.dot(limits.max.point, axe);

      limits.min.point = firstFrame.imagePosition;
      limits.min.positionOnAxe = math.dot(limits.min.point, axe);
    }

    return limits;
  }
}
