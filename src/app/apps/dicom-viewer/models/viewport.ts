import { DicomFrame } from './dicom-frame';
import { Renderable } from './renderable';

export class Viewport extends Renderable {
  deltaX = 0;
  deltaY = 0;
  height = 0;
  image: DicomFrame;
  width = 0;
  windowCenter = 30;
  windowWidth = 400;
  zoom = 1;

  constructor(config: ViewportConfig) {
    super();
    super.fillProperties(config);
    super.decorateProperties();
  }
}

export interface ViewportConfig {
  deltaX?: number;
  deltaY?: number;
  height?: number;
  image: DicomFrame;
  width?: number;
  windowCenter?: number;
  windowWidth?: number;
  zoom?: number;
}
