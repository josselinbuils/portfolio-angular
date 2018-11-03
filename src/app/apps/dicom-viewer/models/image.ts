import { ImageFormat } from 'app/apps/dicom-viewer/constants';

export class Image {

  height: number;
  imageFormat: ImageFormat;
  pixelData: ArrayBufferView;
  rescaleIntercept: number;
  rescaleSlope: number;
  width: number;

  constructor(config: any) {
    this.height = config.height;
    this.imageFormat = config.imageFormat;
    this.pixelData = config.pixelData;
    this.rescaleIntercept = config.rescaleIntercept;
    this.rescaleSlope = config.rescaleSlope;
    this.width = config.width;
  }
}
