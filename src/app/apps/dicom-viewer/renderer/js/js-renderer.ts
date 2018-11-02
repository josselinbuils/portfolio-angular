import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';
import { createImageData, getRenderingProperties } from '../rendering-utils';

export class JsRenderer implements Renderer {

  private readonly context: CanvasRenderingContext2D;
  private lut: any;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  getVOILut(viewport: Viewport): { table: number[]; windowWidth: number } {
    const table: number[] = [];
    const windowWidth: number = viewport.windowWidth;

    for (let i = 0; i < windowWidth; i++) {
      table[i] = Math.floor(i / windowWidth * 256);
    }

    return {table, windowWidth};
  }

  render(viewport: Viewport): void {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, viewport.width, viewport.height);

    if (!this.lut || this.lut.windowWidth !== viewport.windowWidth) {
      this.lut = this.getVOILut(viewport);
    }

    if (viewport.zoom < 1) {
      this.renderCanvasPixels(viewport);
    } else {
      this.renderImagePixels(viewport);
    }
  }

  private renderCanvasPixels(viewport: Viewport): void {
    const {pixelData, rescaleIntercept, rescaleSlope, width} = viewport.image;
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
      const imageDataInstance: ImageData = createImageData(this.context, imageData, displayWidth, displayHeight);
      this.context.putImageData(imageDataInstance, displayX0, displayY0);
    }
  }

  private renderImagePixels(viewport: Viewport): void {
    const {height, pixelData, rescaleIntercept, rescaleSlope, width} = viewport.image;
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

      const imageData = new Uint8ClampedArray(imageData32.buffer);
      const imageDataInstance: ImageData = createImageData(this.context, imageData, croppedImageWidth, croppedImageHeight);
      this.context.putImageData(imageDataInstance, 0, 0);
      this.context.drawImage(
        this.context.canvas, 0, 0, croppedImageWidth, croppedImageHeight, displayX0, displayY0, displayWidth, displayHeight,
      );
    }
  }
}
