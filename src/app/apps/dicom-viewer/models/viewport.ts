import { ViewType } from '../constants';
import { V } from '../math';

import { Annotations } from './annotations';
import { Camera } from './camera';
import { CoordinateSpace } from './coordinate-space';
import { Dataset } from './dataset';
import { Renderable } from './renderable';
import { Volume } from './volume';

const MANDATORY_FIELDS = ['camera', 'dataset', 'viewType'];

export class Viewport extends Renderable implements CoordinateSpace {
  annotations: Annotations = {};
  camera!: Camera;
  dataset!: Dataset;
  height = 0;
  viewType!: ViewType;
  width = 0;
  windowCenter = 30;
  windowWidth = 400;

  private basis?: number[][];
  private imageZoom?: number;
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
      delete this.imageZoom;
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
        V(cameraBasis[0]).div(pixelHeightMm),
        V(cameraBasis[1]).div(pixelHeightMm),
        cameraBasis[2],
      ];
    }
    return this.basis;
  }

  getImageZoom(): number {
    if (this.imageZoom === undefined) {
      const sliceHeight = this.viewType === ViewType.Native
        ? this.dataset.findClosestFrame(this.camera.lookPoint).rows
        : Math.abs(V((this.dataset.volume as Volume).dimensionsVoxels).dot(this.camera.upVector));

      this.imageZoom = this.height / sliceHeight * this.camera.baseFieldOfView / this.camera.fieldOfView;
    }
    return this.imageZoom;
  }

  getWorldOrigin(): number[] {
    if (this.origin === undefined) {

      if (this.width === 0 || this.height === 0) {
        throw new Error(`Viewport has incorrect dimensions: ${this.width}x${this.height}`);
      }

      const direction = this.camera.getDirection();
      const cameraBasis = this.camera.getWorldBasis();

      this.origin = V(this.camera.getWorldOrigin())
        .add(V(cameraBasis[0]).mul(-this.camera.fieldOfView / this.height * this.width / 2))
        .add(V(cameraBasis[1]).mul(-this.camera.fieldOfView / 2))
        .add(direction);
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
