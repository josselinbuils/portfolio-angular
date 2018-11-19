import { fillProperties } from '../helpers/model-helpers';

import { Camera } from './camera';
import { Renderable } from './renderable';

export class Viewport extends Renderable {
  camera: Camera;
  deltaX = 0;
  deltaY = 0;
  height = 0;
  width = 0;
  windowCenter = 30;
  windowWidth = 400;
  zoom = 1;

  constructor(config: object) {
    super();
    fillProperties(this, config);
    super.decorateProperties();
  }
}
