import { Camera } from './camera';
import { Dataset } from './dataset';
import { Renderable } from './renderable';

export class Viewport extends Renderable {
  camera: Camera;
  dataset: Dataset;
  deltaX = 0;
  deltaY = 0;
  height = 0;
  width = 0;
  windowCenter = 30;
  windowWidth = 400;

  constructor(config: object) {
    super();
    super.fillProperties(this, config);
    super.decorateProperties();
  }

  destroy(): void {
    this.dataset.destroy();
  }

  getSliceZoom(): number {
    const sliceHeight = this.dataset.is3D
      ? this.dataset.volume.getSliceDimensions(this.camera.getBasis()).height
      : this.dataset.findClosestFrame(this.camera.lookPoint).rows;

    return this.height / sliceHeight * this.camera.baseFieldOfView / this.camera.fieldOfView;
  }
}
