import { NormalizedImageFormat } from 'app/apps/dicom-viewer/constants';

import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';
import { getRenderingProperties } from '../rendering-utils';

export class JsRenderer implements Renderer {

  private readonly context: CanvasRenderingContext2D;
  private lut?: { table: number[]; windowWidth: number };
  private readonly renderingContext = (document.createElement('canvas') as HTMLCanvasElement).getContext('2d');

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  getVOILut(viewport: Viewport): { table: number[]; windowWidth: number } {
    const table: number[] = [];
    const windowWidth = viewport.windowWidth;

    for (let i = 0; i < windowWidth; i++) {
      table[i] = Math.floor(i / windowWidth * 256);
    }

    return { table, windowWidth };
  }

  render(viewport: Viewport): void {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, viewport.width, viewport.height);

    switch (viewport.image.imageFormat) {
      case NormalizedImageFormat.Int16:
        if (this.lut === undefined || this.lut.windowWidth !== viewport.windowWidth) {
          this.lut = this.getVOILut(viewport);
        }

        if (viewport.zoom < 1) {
          this.renderCanvasPixels(viewport);
        } else {
          this.renderImagePixels(viewport);
        }
        break;

      case NormalizedImageFormat.RGB:
        this.renderRGB(viewport);
        break;

      default:
        throw new Error('Unsupported image format');
    }
  }

  private renderCanvasPixels(viewport: Viewport): void {
    const { pixelData, rescaleIntercept, rescaleSlope, width } = viewport.image;
    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, leftLimit, rightLimit, x0, y0,
    } = getRenderingProperties(viewport);

    const length = displayWidth * displayHeight;

    if (length > 0) {
      const table = this.lut.table;
      const imageData32 = new Uint32Array(length);
      let dataIndex = 0;

      for (let y = displayY0; y <= displayY1; y++) {
        for (let x = displayX0; x <= displayX1; x++) {
          const pixelDataIndex = ((y - y0) / viewport.zoom | 0) * width + ((x - x0) / viewport.zoom | 0);
          const rawValue = pixelData[pixelDataIndex] * rescaleSlope + rescaleIntercept;
          let intensity = 255;

          if (rawValue < leftLimit) {
            intensity = 0;
          } else if (rawValue < rightLimit) {
            intensity = table[rawValue - leftLimit];
          }

          imageData32[dataIndex++] = intensity | intensity << 8 | intensity << 16 | 255 << 24;
        }
      }

      const imageData = new Uint8ClampedArray(imageData32.buffer);
      const imageDataInstance = new ImageData(imageData, displayWidth, displayHeight);
      this.context.putImageData(imageDataInstance, displayX0, displayY0);
    }
  }

  private renderImagePixels(viewport: Viewport): void {
    const { height, pixelData, rescaleIntercept, rescaleSlope, width } = viewport.image;
    const {
      displayHeight, displayWidth, displayX0, displayY0, leftLimit, rightLimit, x0, x1, y0, y1,
    } = getRenderingProperties(viewport);

    const imageY0 = y0 < 0 ? Math.round(-y0 / viewport.zoom) : 0;
    const imageY1 = y1 > viewport.height ? height - Math.round((y1 - viewport.height) / viewport.zoom) : height;

    const imageX0 = x0 < 0 ? Math.round(-x0 / viewport.zoom) : 0;
    const imageX1 = x1 > viewport.width ? width - Math.round((x1 - viewport.width) / viewport.zoom) : width;

    const croppedImageWidth = imageX1 - imageX0;
    const croppedImageHeight = imageY1 - imageY0;

    const length = croppedImageWidth * croppedImageHeight;

    if (length > 0) {
      const table = this.lut.table;
      const imageData32 = new Uint32Array(length);
      let dataIndex = 0;

      for (let y = imageY0; y <= imageY1; y++) {
        for (let x = imageX0; x < imageX1; x++) {
          const rawValue = pixelData[y * width + x] * rescaleSlope + rescaleIntercept;
          let intensity = 0;

          if (rawValue >= rightLimit) {
            intensity = 255;
          } else if (rawValue > leftLimit) {
            intensity = table[rawValue - leftLimit];
          }

          imageData32[dataIndex++] = intensity | intensity << 8 | intensity << 16 | 255 << 24;
        }
      }

      this.renderingContext.canvas.width = croppedImageWidth;
      this.renderingContext.canvas.height = croppedImageHeight;

      const imageData = new Uint8ClampedArray(imageData32.buffer);
      const imageDataInstance = new ImageData(imageData, croppedImageWidth, croppedImageHeight);

      this.renderingContext.putImageData(imageDataInstance, 0, 0);
      this.context.drawImage(this.renderingContext.canvas, displayX0, displayY0, displayWidth, displayHeight);
    }
  }

  private renderRGB(viewport: Viewport): void {
    const { height, pixelData, width } = viewport.image;
    const { imageHeight, imageWidth, x0, y0 } = getRenderingProperties(viewport);

    this.renderingContext.canvas.width = width;
    this.renderingContext.canvas.height = height;

    const pixelDataLength = pixelData.length;
    const imageData32 = new Uint32Array(width * height);
    let dataIndex = 0;

    for (let i = 0; i < pixelDataLength; i += 3) {
      imageData32[dataIndex++] = pixelData[i] | pixelData[i + 1] << 8 | pixelData[i + 2] << 16 | 255 << 24;
    }

    const imageData = new Uint8ClampedArray(imageData32.buffer);
    const imageDataInstance = new ImageData(imageData, width, height);

    this.renderingContext.putImageData(imageDataInstance, 0, 0);
    this.context.drawImage(this.renderingContext.canvas, x0, y0, imageWidth, imageHeight);
  }
}
