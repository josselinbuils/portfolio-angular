import { ViewType } from '../constants';
import { math } from '../helpers/maths-helpers';

import { Frame } from './frame';
import { Renderable } from './renderable';
import { Volume } from './volume';

export class Camera extends Renderable {
  baseFieldOfView: number;
  eyePoint: number[];
  fieldOfView: number;
  lookPoint: number[];
  upVector: number[];

  private basis?: number[][];
  private direction: number[];

  static fromFrame(frame: Frame): Camera {
    const { dimensionsMm, imageCenter, imageNormal, imageOrientation } = frame;

    const baseFieldOfView = dimensionsMm[1];
    const fieldOfView = baseFieldOfView;
    const lookPoint = imageCenter.slice();
    const eyePoint = math.subtract(lookPoint, imageNormal);
    const upVector = imageOrientation[1];

    return new Camera({ baseFieldOfView, eyePoint, fieldOfView, lookPoint, upVector });
  }

  static fromVolume(volume: Volume, viewType: ViewType): Camera {
    const { firstVoxelCenter, orientedDimensionsMm, voxelSpacing } = volume;

    let direction: number[];
    let upVector: number[];

    switch (viewType) {
      case ViewType.Axial:
        direction = [0, 0, 1];
        upVector = [0, 1, 0];
        break;
      case ViewType.Coronal:
      case ViewType.Oblique:
        direction = [0, 1, 0];
        upVector = [0, 0, 1];
        break;
      case ViewType.Sagittal:
        direction = [1, 0, 0];
        upVector = [0, 0, 1];
    }

    const baseFieldOfView = Math.max(
      ...orientedDimensionsMm.map(dimensionVector => math.dot(dimensionVector, upVector)),
    );
    const fieldOfView = baseFieldOfView;
    const lookPoint = math.chain(firstVoxelCenter)
      .add(math.multiply(orientedDimensionsMm[0], 0.5))
      .add(math.multiply(orientedDimensionsMm[1], 0.5))
      .add(math.multiply(orientedDimensionsMm[2], 0.5))
      .subtract(math.multiply(voxelSpacing, 0.5))
      .done();
    const eyePoint = math.subtract(lookPoint, direction);

    return new Camera({ baseFieldOfView, eyePoint, fieldOfView, lookPoint, upVector });
  }

  constructor(config: any) {
    super();
    super.fillProperties(this, config);
    super.decorateProperties();
    this.onUpdate.subscribe(() => {
      delete this.basis;
      delete this.direction;
    });
  }

  /*
   * y
   * 🡑     z
   * │   ╱
   * │ ╱
   * └───────> x
   */
  getBasis(): number[][] {
    if (this.basis === undefined) {
      const y = math.normalize(this.upVector);
      const z = this.getDirection();
      const x = math.chain(z).cross(y).normalize().done();
      this.basis = [x, y, z];
    }
    return this.basis;
  }

  getDirection(): number[] {
    if (this.direction === undefined) {
      this.direction = math.chain(this.lookPoint).subtract(this.eyePoint).normalize().done();
    }
    return this.direction;
  }
}
