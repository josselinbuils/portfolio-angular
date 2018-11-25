import { ViewType } from '../constants';
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

  getBasis(): number[][] {
    if (this.basis === undefined) {
      const cameraBasis = this.camera.getBasis();
      this.basis = [
        cameraBasis[0],
        math.multiply(cameraBasis[1], -1) as number[],
        cameraBasis[2],
      ];
    }
    return this.basis;
  }

  getImageZoom(): number {
    const sliceHeight = this.dataset.volume !== undefined
      ? this.dataset.volume.getImageDimensions(this.camera.getBasis()).height
      : this.dataset.findClosestFrame(this.camera.lookPoint).rows;

    return this.height / sliceHeight * this.camera.baseFieldOfView / this.camera.fieldOfView;
  }

  getOrigin(): number[] {
    if (this.origin === undefined) {

      if (this.width === 0 || this.height === 0) {
        throw new Error(`Viewport has incorrect dimensions: ${this.width}x${this.height}`);
      }

      const cameraBasis = this.camera.getBasis();
      const zoom = this.getImageZoom();

      const xStepVector = math.chain(cameraBasis[0])
        .dotMultiply(this.dataset.voxelSpacing)
        .divide(zoom);

      const yStepVector = math.chain(cameraBasis[1])
        .dotMultiply(this.dataset.voxelSpacing)
        .divide(zoom)
        .multiply(-1);

      this.origin = math.chain(this.camera.getOrigin())
        .add(xStepVector.multiply(-this.width / 2).done())
        .add(yStepVector.multiply(-this.height / 2).done())
        .done() as number[];
    }
    return this.origin;
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
}
