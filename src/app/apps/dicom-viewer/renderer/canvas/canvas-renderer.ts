import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';

export class CanvasRenderer implements Renderer {

  private context: CanvasRenderingContext2D;
  private lut: any;
  private renderingContext: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
    this.renderingContext = document.createElement('canvas').getContext('2d');
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
    const renderZoom: number = Math.min(zoom, 1);

    const imageWidth: number = Math.round(width * renderZoom);
    const imageHeight: number = Math.round(height * renderZoom);

    const length: number = imageWidth * imageHeight * 4;

    if (length > 0) {
      const leftLimit: number = Math.floor(viewport.windowLevel - viewport.windowWidth / 2);
      const rightLimit: number = Math.floor(viewport.windowLevel + viewport.windowWidth / 2);
      const imageData: Uint8ClampedArray = new Uint8ClampedArray(length);
      let dataIndex: number = 0;

      for (let y: number = 0; y < imageWidth; y++) {
        for (let x: number = 0; x < imageHeight; x++) {
          const pixelDataIndex: number = Math.round(y / renderZoom) * width + Math.round(x / renderZoom);
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
        imageDataInstance = new ImageData(imageData, imageWidth, imageHeight);
      } catch (e) {
        imageDataInstance = this.context.createImageData(imageWidth, imageHeight);
        imageDataInstance.data.set(imageData);
      }

      const renderingCanvas: HTMLCanvasElement = this.renderingContext.canvas;
      renderingCanvas.width = imageWidth;
      renderingCanvas.height = imageHeight;
      this.renderingContext.putImageData(imageDataInstance, 0, 0);

      const newWidth: number = Math.round(imageWidth * zoom);
      const newHeight: number = Math.round(imageHeight * zoom);

      const newX: number = Math.round((viewport.width - newWidth) / 2 + viewport.deltaX * viewport.width);
      const newY: number = Math.round((viewport.height - newHeight) / 2 + viewport.deltaY * viewport.height);

      (<any> this.context).msImageSmoothingEnabled = false;
      this.context.imageSmoothingEnabled = false;

      this.context.drawImage(renderingCanvas, newX, newY, newWidth, newHeight);
    }
  }

  resize(viewport: Viewport): void {
  }
}
