import * as math from 'mathjs';

import { fillProperties } from '../helpers/model-helpers';

import { Frame } from './frame';
import { Renderable } from './renderable';

export class Camera extends Renderable {
  eyePoint: number[];
  fieldOfView: number;
  lookPoint: number[];
  upVector: number[];

  static fromFrame(frame: Frame): Camera {
    const { dimensionsMm, imageCenter, imageNormal, imageOrientation } = frame;

    const fieldOfView = dimensionsMm[1];
    const lookPoint = imageCenter.slice();
    const eyePoint = math.subtract(lookPoint, imageNormal);
    const upVector = imageOrientation[1];

    return new Camera({ eyePoint, fieldOfView, lookPoint, upVector });
  }

  constructor(config: any) {
    super();
    fillProperties(this, config);
    super.decorateProperties();
  }
}
