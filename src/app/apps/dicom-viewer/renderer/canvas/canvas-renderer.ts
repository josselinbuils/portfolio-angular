import { Viewport } from '../../models/viewport';
import { JsRenderer } from '../js/js-renderer';
import { Renderer } from '../renderer';
import { createImageData, getRenderingProperties } from '../rendering-utils';

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
      this.lut = this.jsRenderer.getVOILut(viewport);
    }

    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, leftLimit, rightLimit, x0, x1, y0, y1,
    } = getRenderingProperties(viewport);

    const imageY0: number = y0 < 0 ? Math.round(-y0 / viewport.zoom) : 0;
    const imageY1: number = y1 > viewport.height ? height - Math.round((y1 - viewport.height) / viewport.zoom) : height;

    const imageX0: number = x0 < 0 ? Math.round(-x0 / viewport.zoom) : 0;
    const imageX1: number = x1 > viewport.width ? width - Math.round((x1 - viewport.width) / viewport.zoom) : width;

    const croppedImageWidth: number = imageX1 - imageX0;
    const croppedImageHeight: number = imageY1 - imageY0;

    if (viewport.zoom < 1) {
      this.jsRenderer.render(viewport);
      return;
    }

    const length: number = croppedImageWidth * croppedImageHeight * 4;

    if (length > 0) {
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

      this.renderingContext.canvas.width = croppedImageWidth;
      this.renderingContext.canvas.height = croppedImageHeight;

      const imageDataInstance: ImageData = createImageData(this.renderingContext, imageData, croppedImageWidth, croppedImageHeight);
      this.renderingContext.putImageData(imageDataInstance, 0, 0);
    }

    (<any> this.context).msImageSmoothingEnabled = false;
    this.context.imageSmoothingEnabled = false;

    this.context.drawImage(this.renderingContext.canvas, displayX0, displayY0, displayWidth, displayHeight);
  }

  resize(viewport: Viewport): void {
  }
}
