export class Image {

  height: number;
  imageFormat: string;
  pixelData: number[];
  rescaleIntercept: number;
  rescaleSlope: number;
  width: number;

  constructor(config) {
    this.height = config.height || null;
    this.imageFormat = config.imageFormat || null;
    this.pixelData = config.pixelData || null;
    this.rescaleIntercept = config.rescaleIntercept || null;
    this.rescaleSlope = config.rescaleSlope || null;
    this.width = config.width || null;
  }
}
