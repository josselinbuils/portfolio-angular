import { DicomFrame } from './dicom-frame';
import { Renderable } from './renderable';

export class Viewport extends Renderable {
  deltaX: number;
  deltaY: number;
  height: number;
  image: DicomFrame;
  width: number;
  windowCenter: number;
  windowWidth: number;
  zoom: number;

  constructor(config: any) {
    super();

    this.deltaX = typeof config.deltaX === 'number' ? config.deltaX : 0;
    this.deltaY = typeof config.deltaY === 'number' ? config.deltaY : 0;
    this.height = config.height;
    this.image = config.image;
    this.width = config.width;
    this.windowCenter = config.windowCenter;
    this.windowWidth = config.windowWidth;
    this.zoom = config.zoom;

    super.decorateProperties();
  }
}
