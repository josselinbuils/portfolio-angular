import { NormalizedImageFormat } from '../../constants';
import { Renderer } from '../renderer';
import { RenderingParameters } from '../rendering-parameters';
import { getRenderingProperties } from '../rendering-utils';

export class JsRenderer implements Renderer {

  private readonly context: CanvasRenderingContext2D;
  private lut?: { table: number[]; windowWidth: number };
  private readonly renderingContext = (document.createElement('canvas') as HTMLCanvasElement).getContext('2d');

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  render(renderingParameters: RenderingParameters): void {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const { frame, zoom } = renderingParameters;

    switch (frame.imageFormat) {
      case NormalizedImageFormat.Int16:
        const { windowWidth } = renderingParameters;

        if (this.lut === undefined || this.lut.windowWidth !== windowWidth) {
          this.lut = this.getVOILut(windowWidth);
        }

        if (zoom < 1) {
          this.renderCanvasPixels(renderingParameters);
        } else {
          this.renderImagePixels(renderingParameters);
        }
        break;

      case NormalizedImageFormat.RGB:
        this.renderRGB(renderingParameters);
        break;

      default:
        throw new Error('Unsupported image format');
    }
  }

  private getVOILut(windowWidth: number): { table: number[]; windowWidth: number } {
    const table: number[] = [];

    for (let i = 0; i < windowWidth; i++) {
      table[i] = Math.floor(i / windowWidth * 256);
    }

    return { table, windowWidth };
  }

  private renderCanvasPixels(renderingParameters: RenderingParameters): void {
    const { frame, zoom } = renderingParameters;
    const { columns, pixelData, rescaleIntercept, rescaleSlope } = frame;
    const { width, height } = this.canvas;
    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, leftLimit, rightLimit, x0, y0,
    } = getRenderingProperties(renderingParameters, width, height);

    const length = displayWidth * displayHeight;

    if (length > 0) {
      const table = this.lut.table;
      const imageData32 = new Uint32Array(length);
      let dataIndex = 0;

      for (let y = displayY0; y <= displayY1; y++) {
        for (let x = displayX0; x <= displayX1; x++) {
          const pixelDataIndex = ((y - y0) / zoom | 0) * columns + ((x - x0) / zoom | 0);
          const rawValue = pixelData[pixelDataIndex] * rescaleSlope + rescaleIntercept | 0;
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

  private renderImagePixels(renderingParameters: RenderingParameters): void {
    const { frame, zoom } = renderingParameters;
    const { columns, pixelData, rescaleIntercept, rescaleSlope, rows } = frame;
    const { width, height } = this.canvas;
    const {
      displayHeight, displayWidth, displayX0, displayY0, leftLimit, rightLimit, x0, x1, y0, y1,
    } = getRenderingProperties(renderingParameters, width, height);

    const imageY0 = y0 < 0 ? Math.round(-y0 / zoom) : 0;
    const imageY1 = y1 > height ? rows - Math.round((y1 - height) / zoom) : rows;

    const imageX0 = x0 < 0 ? Math.round(-x0 / zoom) : 0;
    const imageX1 = x1 > width ? columns - Math.round((x1 - width) / zoom) : columns;

    const croppedImageWidth = imageX1 - imageX0;
    const croppedImageHeight = imageY1 - imageY0;

    const length = croppedImageWidth * croppedImageHeight;

    if (length > 0) {
      const table = this.lut.table;
      const imageData32 = new Uint32Array(length);
      let dataIndex = 0;

      for (let y = imageY0; y <= imageY1; y++) {
        for (let x = imageX0; x < imageX1; x++) {
          const rawValue = pixelData[y * columns + x] * rescaleSlope + rescaleIntercept;
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

  private renderRGB(renderingParameters: RenderingParameters): void {
    const { columns, pixelData, rows } = renderingParameters.frame;
    const { width, height } = this.canvas;
    const { imageHeight, imageWidth, x0, y0 } = getRenderingProperties(renderingParameters, width, height);

    this.renderingContext.canvas.width = columns;
    this.renderingContext.canvas.height = rows;

    const pixelDataLength = pixelData.length;
    const imageData32 = new Uint32Array(columns * rows);
    let dataIndex = 0;

    for (let i = 0; i < pixelDataLength; i += 3) {
      imageData32[dataIndex++] = pixelData[i] | pixelData[i + 1] << 8 | pixelData[i + 2] << 16 | 255 << 24;
    }

    const imageData = new Uint8ClampedArray(imageData32.buffer);
    const imageDataInstance = new ImageData(imageData, columns, rows);

    this.renderingContext.putImageData(imageDataInstance, 0, 0);
    this.context.drawImage(this.renderingContext.canvas, x0, y0, imageWidth, imageHeight);
  }
}
