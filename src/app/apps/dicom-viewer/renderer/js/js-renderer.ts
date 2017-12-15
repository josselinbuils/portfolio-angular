import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';

export class JsRenderer implements Renderer {

  private context: CanvasRenderingContext2D;
  private lut: any;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  destroy(): void {
  }

  render(viewport: Viewport): void {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, viewport.width, viewport.height);

    const {height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width} = viewport.image;

    if (!this.lut || this.lut.windowWidth !== viewport.windowWidth) {
      const table: number[] = [];

      for (let i: number = 0; i < viewport.windowWidth; i++) {
        table[i] = Math.floor(i / viewport.windowWidth * 256);
      }

      this.lut = {
        windowWidth: viewport.windowWidth,
        table,
      };
    }

    const zoom: number = viewport.height / height * viewport.zoom;
    const imageWidth: number = Math.round(width * zoom);
    const imageHeight: number = Math.round(height * zoom);

    const y0: number = Math.round(((viewport.height - imageHeight) / 2 + viewport.deltaY * viewport.height));
    const y1: number = y0 + imageHeight;

    const x0: number = Math.round(((viewport.width - imageWidth) / 2 + viewport.deltaX * viewport.width));
    const x1: number = x0 + imageWidth;

    const displayY0: number = Math.max(y0, 0);
    const displayY1: number = Math.min(y1, viewport.height - 1);

    const displayX0: number = Math.max(x0, 0);
    const displayX1: number = Math.min(x1, viewport.width - 1);

    const displayWidth: number = Math.max(displayX1 - displayX0, 0);
    const displayHeight: number = Math.max(displayY1 - displayY0, 0);

    const length: number = displayWidth * displayHeight * 4;

    const leftLimit: number = Math.floor(viewport.windowLevel - viewport.windowWidth / 2);
    const rightLimit: number = Math.floor(viewport.windowLevel + viewport.windowWidth / 2);

    if (length > 0) {
      const imageData: Uint8ClampedArray = new Uint8ClampedArray(length);
      let dataIndex: number = 0;

      for (let y: number = displayY0; y < displayY1; y++) {
        for (let x: number = displayX0; x < displayX1; x++) {
          const pixelDataIndex: number = Math.floor((y - y0) / zoom) * width + Math.floor((x - x0) / zoom);
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

      this.context.putImageData(new ImageData(imageData, displayWidth, displayHeight), displayX0, displayY0);
    }
  }

  // noinspection TsLint
  resize(viewport: Viewport): void {
  }
}
