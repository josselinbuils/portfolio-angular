import { ViewType } from '../constants';
import { getFromWorldTransformationMatrix } from '../utils/coordinates';
import { math } from '../utils/math';

import { Annotations } from './annotations';
import { Camera } from './camera';
import { CoordinateSpace } from './coordinate-space';
import { Dataset } from './dataset';
import { Renderable } from './renderable';

const MANDATORY_FIELDS = ['camera', 'dataset', 'viewType'];

export class Viewport extends Renderable implements CoordinateSpace {
  annotations: Annotations = {};
  camera!: Camera;
  dataset!: Dataset;
  deltaX = 0;
  deltaY = 0;
  height = 0;
  viewType!: ViewType;
  width = 0;
  windowCenter = 30;
  windowWidth = 400;

  private basis?: number[][];
  private origin?: number[];

  constructor(config: object) {
    super();
    super.fillProperties(config);
    super.checkMandatoryFieldsPresence(MANDATORY_FIELDS);
    super.decorateProperties();
    this.updateAnnotations();
    this.onUpdate.subscribe(() => {
      delete this.basis;
      delete this.origin;
    });
  }

  destroy(): void {
    this.dataset.destroy();
  }

  getWorldBasis(): number[][] {
    if (this.basis === undefined) {
      const cameraBasis = this.camera.getWorldBasis();
      const pixelHeightMm = this.camera.fieldOfView / this.height;

      this.basis = [
        math.chain(cameraBasis[0]).divide(pixelHeightMm).done(),
        math.chain(cameraBasis[1]).divide(pixelHeightMm).done(),
        cameraBasis[2],
      ];
    }
    return this.basis;
  }

  getImageZoom(): number {
    return this.camera.baseFieldOfView / this.camera.fieldOfView;
  }

  getWorldOrigin(): number[] {
    if (this.origin === undefined) {

      if (this.width === 0 || this.height === 0) {
        throw new Error(`Viewport has incorrect dimensions: ${this.width}x${this.height}`);
      }

      const direction = this.camera.getDirection();
      const cameraBasis = this.camera.getWorldBasis();

      this.origin = math.chain(this.camera.getWorldOrigin())
        .add(math.multiply(cameraBasis[0], -this.camera.fieldOfView / this.height * this.width / 2))
        .add(math.multiply(cameraBasis[1], -this.camera.fieldOfView / 2))
        .add(direction)
        .done() as number[];
    }
    return this.origin;
  }

  fromWorld(world: CoordinateSpace): number[][] {
    return getFromWorldTransformationMatrix(world, this);
  }

  updateAnnotations(updatedProperties?: any): void {
    try {
      if (updatedProperties !== undefined) {
        Object.entries(updatedProperties).forEach(([key, value]) => this.annotations[key] = value);
      } else {
        this.annotations.viewType = this.viewType;
        this.annotations.windowCenter = this.windowCenter;
        this.annotations.windowWidth = this.windowWidth;
        this.annotations.zoom = this.getImageZoom();
      }
    } catch (error) {
      error.message = `Unable to compute annotations: ${error.message}`;
      throw error;
    }
  }

  toWorld(world: CoordinateSpace): number[][] {
    return math.inv(this.fromWorld(world)) as number[][];
  }
}
