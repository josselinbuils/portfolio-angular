import { ViewType } from '../constants';

import { Annotations } from './annotations';
import { Camera } from './camera';
import { Dataset } from './dataset';
import { Renderable } from './renderable';

const MANDATORY_FIELDS = ['camera', 'dataset', 'viewType'];

export class Viewport extends Renderable {
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

  constructor(config: object) {
    super();
    super.fillProperties(config);
    super.checkMandatoryFieldsPresence(MANDATORY_FIELDS);
    super.decorateProperties();
    this.updateAnnotations();
  }

  destroy(): void {
    this.dataset.destroy();
  }

  getImageZoom(): number {
    const sliceHeight = this.dataset.volume !== undefined
      ? this.dataset.volume.getImageDimensions(this.camera.getBasis()).height
      : this.dataset.findClosestFrame(this.camera.lookPoint).rows;

    return this.height / sliceHeight * this.camera.baseFieldOfView / this.camera.fieldOfView;
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
