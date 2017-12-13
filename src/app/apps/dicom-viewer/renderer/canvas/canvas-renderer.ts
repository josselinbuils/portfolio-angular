import { Renderer } from '../renderer';
import { Viewport } from '../../models/viewport';

export class CanvasRenderer implements Renderer {

  private context: CanvasRenderingContext2D;
  private lut: any;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  render(viewport: Viewport) {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, viewport.width, viewport.height);

    const {height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width} = viewport.image;

    if (!this.lut || this.lut.windowWidth !== viewport.windowWidth) {
      const table = [];

      for (let i = 0; i < viewport.windowWidth; i++) {
        table[i] = Math.floor(i / viewport.windowWidth * 256);
      }

      this.lut = {
        windowWidth: viewport.windowWidth,
        table: table
      };
    }

    const zoom = viewport.height / height * viewport.zoom;
    const imageWidth = Math.round(width * zoom);
    const imageHeight = Math.round(height * zoom);

    const y0 = Math.round(((viewport.height - imageHeight) / 2 + viewport.deltaY * viewport.height));
    const y1 = y0 + imageHeight;

    const x0 = Math.round(((viewport.width - imageWidth) / 2 + viewport.deltaX * viewport.width));
    const x1 = x0 + imageWidth;

    const displayY0 = Math.max(y0, 0);
    const displayY1 = Math.min(y1, viewport.height - 1);

    const displayX0 = Math.max(x0, 0);
    const displayX1 = Math.min(x1, viewport.width - 1);

    const displayWidth = Math.max(displayX1 - displayX0, 0);
    const displayHeight = Math.max(displayY1 - displayY0, 0);

    const length = displayWidth * displayHeight * 4;

    const leftLimit = Math.floor(viewport.windowLevel - viewport.windowWidth / 2);
    const rightLimit = Math.floor(viewport.windowLevel + viewport.windowWidth / 2);

    if (length > 0) {
      const imageData = new Uint8ClampedArray(length);
      let dataIndex = 0;

      for (let y = displayY0; y < displayY1; y++) {
        for (let x = displayX0; x < displayX1; x++) {
          const pixelDataIndex = Math.floor((y - y0) / zoom) * width + Math.floor((x - x0) / zoom);
          const rawValue = pixelData[pixelDataIndex] * rescaleSlope + rescaleIntercept;
          let intensity = 0;

          // intensity = ((rawValue - viewport.windowLevel - 0.5) / viewport.windowWidth + 0.5) * 256;
          // intensity = Math.min(Math.max(intensity, 0), 255);

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

  resize(viewport: Viewport) {

  }
}
