import { DicomInstance } from 'app/apps/dicom-viewer/dicom-instance';

export class Viewport {
  deltaX: number;
  deltaY: number;
  height: number;
  image: DicomInstance;
  width: number;
  windowCenter: number;
  windowWidth: number;
  zoom: number;

  constructor(config: any) {
    this.deltaX = typeof config.deltaX === 'number' ? config.deltaX : 0;
    this.deltaY = typeof config.deltaY === 'number' ? config.deltaY : 0;
    this.height = config.height;
    this.image = config.image;
    this.width = config.width;
    this.windowCenter = config.windowCenter;
    this.windowWidth = config.windowWidth;
    this.zoom = config.zoom;
  }
}
