export class Image {

  height: number;
  imageFormat: string;
  pixelData: Int8Array | Uint8Array | Int16Array | Uint16Array;
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
