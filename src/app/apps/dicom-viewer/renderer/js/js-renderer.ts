import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';
import { createImageData, getRenderingProperties } from '../rendering-utils';

export class JsRenderer implements Renderer {

  private context: CanvasRenderingContext2D;
  private lut: any;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  destroy(): void {
  }

  getVOILut(viewport: Viewport): { table: number[]; windowWidth: number } {
    const table: number[] = [];
    const windowWidth: number = viewport.windowWidth;

    for (let i: number = 0; i < windowWidth; i++) {
      table[i] = Math.floor(i / windowWidth * 256);
    }

    return {table, windowWidth};
  }

  render(viewport: Viewport): void {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, viewport.width, viewport.height);

    const {height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width} = viewport.image;

    if (!this.lut || this.lut.windowWidth !== viewport.windowWidth) {
      this.lut = this.getVOILut(viewport);
    }

    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, leftLimit, rightLimit, x0, y0,
    } = getRenderingProperties(viewport);

    const length: number = displayWidth * displayHeight * 4;

    if (length > 0) {
      const imageData: Uint8ClampedArray = new Uint8ClampedArray(length);
      let dataIndex: number = 0;

      for (let y: number = displayY0; y <= displayY1; y++) {
        for (let x: number = displayX0; x <= displayX1; x++) {
          const pixelDataIndex: number = Math.round((y - y0) / viewport.zoom) * width + Math.round((x - x0) / viewport.zoom);
          const rawValue: number = pixelData[pixelDataIndex] * rescaleSlope + rescaleIntercept;
          let intensity: number = 0;

          if (rawValue >= rightLimit) {
            intensity = 255;
          } else if (rawValue > leftLimit) {
            intensity = this.lut.table[rawValue - leftLimit];
          }

          imageData[dataIndex++] = intensity;
          imageData[dataIndex++] = intensity;
          imageData[dataIndex++] = intensity;
          imageData[dataIndex++] = 255;
        }
      }

      const imageDataInstance: ImageData = createImageData(this.context, imageData, displayWidth, displayHeight);
      this.context.putImageData(imageDataInstance, displayX0, displayY0);
    }
  }

  resize(viewport: Viewport): void {
  }
}
