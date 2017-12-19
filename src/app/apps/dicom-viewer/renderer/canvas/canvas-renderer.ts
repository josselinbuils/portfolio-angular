import { Viewport } from '../../models/viewport';
import { JsRenderer } from '../js/js-renderer';
import { Renderer } from '../renderer';

export class CanvasRenderer implements Renderer {

  private context: CanvasRenderingContext2D;
  private jsRenderer: JsRenderer;
  private lut: any;
  private renderingContext: CanvasRenderingContext2D;
  private renderingProperties: any;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
    this.renderingContext = document.createElement('canvas').getContext('2d');
    this.jsRenderer = new JsRenderer(canvas);
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
    const y1: number = y0 + imageHeight - 1;

    const x0: number = Math.round(((viewport.width - imageWidth) / 2 + viewport.deltaX * viewport.width));
    const x1: number = x0 + imageWidth - 1;

    const displayY0: number = Math.max(y0, 0);
    const displayY1: number = Math.min(y1, viewport.height - 1);

    const displayX0: number = Math.max(x0, 0);
    const displayX1: number = Math.min(x1, viewport.width - 1);

    const displayWidth: number = Math.max(displayX1 - displayX0 + 1, 0);
    const displayHeight: number = Math.max(displayY1 - displayY0 + 1, 0);

    const imageY0: number = y0 < 0 ? Math.round(-y0 / zoom) : 0;
    const imageY1: number = y1 > viewport.height ? height - Math.round((y1 - viewport.height) / zoom) : height;

    const imageX0: number = x0 < 0 ? Math.round(-x0 / zoom) : 0;
    const imageX1: number = x1 > viewport.width ? width - Math.round((x1 - viewport.width) / zoom) : width;

    const croppedImageWidth: number = imageX1 - imageX0;
    const croppedImageHeight: number = imageY1 - imageY0;

    if (croppedImageWidth >= displayWidth) {
      this.jsRenderer.render(viewport);
      return;
    }

    const length: number = croppedImageWidth * croppedImageHeight * 4;

    if (length > 0) {
      const leftLimit: number = Math.floor(viewport.windowLevel - viewport.windowWidth / 2);
      const rightLimit: number = Math.floor(viewport.windowLevel + viewport.windowWidth / 2);
      const imageData: Uint8ClampedArray = new Uint8ClampedArray(length);
      let dataIndex: number = 0;

      for (let y: number = imageY0; y <= imageY1; y++) {
        for (let x: number = imageX0; x < imageX1; x++) {
          const pixelDataIndex: number = y * width + x;
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

      let imageDataInstance: ImageData;

      try {
        imageDataInstance = new ImageData(imageData, croppedImageWidth, croppedImageHeight);
      } catch (e) {
        imageDataInstance = this.context.createImageData(croppedImageWidth, croppedImageHeight);
        imageDataInstance.data.set(imageData);
      }

      const renderingCanvas: HTMLCanvasElement = this.renderingContext.canvas;
      renderingCanvas.width = croppedImageWidth;
      renderingCanvas.height = croppedImageHeight;
      this.renderingContext.putImageData(imageDataInstance, 0, 0);
    }

    (<any> this.context).msImageSmoothingEnabled = false;
    this.context.imageSmoothingEnabled = false;

    this.context.drawImage(this.renderingContext.canvas, displayX0, displayY0, displayWidth, displayHeight);
  }

  resize(viewport: Viewport): void {
  }
}
