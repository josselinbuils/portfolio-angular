import { ViewType } from '../constants';
import { getFromWorldTransformationMatrix } from '../utils/coordinates';
import { math } from '../utils/math';

import { CoordinateSpace } from './coordinate-space';
import { Frame } from './frame';
import { Renderable } from './renderable';
import { Volume } from './volume';

const MANDATORY_FIELDS = ['baseFieldOfView', 'eyePoint', 'fieldOfView', 'lookPoint', 'upVector'];

export class Camera extends Renderable implements CoordinateSpace {
  // Volume size along the vertical axis of the camera
  baseFieldOfView!: number;
  eyePoint!: number[];
  fieldOfView!: number;
  lookPoint!: number[];
  upVector!: number[];

  private basis?: number[][];
  private direction?: number[];

  static fromFrame(frame: Frame): Camera {
    const { dimensionsMm, imageCenter, imageNormal, imageOrientation } = frame;

    const baseFieldOfView = dimensionsMm[1];
    const fieldOfView = baseFieldOfView;
    const lookPoint = imageCenter.slice();
    const eyePoint = math.subtract(lookPoint, imageNormal);
    // Frame vertical axis is inverted compared to axial view
    const upVector = math.multiply(imageOrientation[1], -1);

    return new Camera({ baseFieldOfView, eyePoint, fieldOfView, lookPoint, upVector });
  }

  static fromVolume(volume: Volume, viewType: ViewType): Camera {
    const { firstVoxelCenter, orientedDimensionsMm, voxelSpacing } = volume;

    let direction: number[];
    let upVector: number[];

    switch (viewType) {
      case ViewType.Axial:
        direction = [0, 0, 1];
        upVector = [0, -1, 0];
        break;
      case ViewType.Coronal:
        direction = [0, 1, 0];
        upVector = [0, 0, 1];
        break;
      case ViewType.Sagittal:
        direction = [-1, 0, 0];
        upVector = [0, 0, 1];
        break;
      default:
        throw new Error(`Unknown view type: ${viewType}`);
    }

    const baseFieldOfView = volume.getOrientedDimensionMm(upVector);
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
    super.fillProperties(config);
    super.checkMandatoryFieldsPresence(MANDATORY_FIELDS);
    super.decorateProperties();
    this.onUpdate.subscribe(() => {
      delete this.basis;
      delete this.direction;
    });
  }

  fromWorld(world: CoordinateSpace): number[][] {
    return getFromWorldTransformationMatrix(world, this);
  }

  /*
   * LPS
   *    ------> x
   *   /|
   *  / |
   * z  y
   */
  getWorldBasis(): number[][] {
    if (this.basis === undefined) {
      const y = math.chain(this.upVector).normalize().multiply(-1).done();
      const z = this.getDirection();
      const x = math.chain(y).cross(z).normalize().done();
      this.basis = [x, y, z];
    }
    return this.basis;
  }

  getDirection(): number[] {
    if (this.direction === undefined) {
      this.direction = math.chain(this.lookPoint).subtract(this.eyePoint).normalize().done() as number[];
    }
    return this.direction;
  }

  getWorldOrigin(): number[] {
    return this.eyePoint;
  }

  toWorld(world: CoordinateSpace): number[][] {
    return math.inv(this.fromWorld(world)) as number[][];
  }
}
