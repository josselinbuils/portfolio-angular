import { NormalizedImageFormat } from '../../constants';
import { findFrame } from '../../helpers/camera-helpers';
import { Dataset, Frame } from '../../models';
import { Renderer } from '../renderer';
import { RenderingParameters } from '../rendering-parameters';
import { RenderingProperties } from '../rendering-properties';
import { getRenderingProperties } from '../rendering-utils';

export class JsFrameRenderer implements Renderer {

  private readonly context: CanvasRenderingContext2D;
  private lut?: { table: number[]; windowWidth: number };
  private readonly renderingContext = (document.createElement('canvas') as HTMLCanvasElement).getContext('2d');

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  render(dataset: Dataset, renderingParameters: RenderingParameters): void {
    const { width, height } = this.canvas;
    const { camera, zoom } = renderingParameters;
    const frame = findFrame(dataset, camera);
    const { columns, imageFormat, rows } = frame;

    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, width, height);

    const renderingProperties = getRenderingProperties(renderingParameters, columns, rows, width, height);

    if (!renderingProperties.isImageInViewport) {
      return;
    }

    switch (imageFormat) {
      case NormalizedImageFormat.Int16:
        const { windowWidth } = renderingParameters;

        if (this.lut === undefined || this.lut.windowWidth !== windowWidth) {
          this.lut = this.getVOILut(windowWidth);
        }

        if (zoom < 1) {
          this.renderViewportPixels(frame, renderingParameters, renderingProperties);
        } else {
          this.renderImagePixels(frame, renderingParameters, renderingProperties);
        }
        break;

      case NormalizedImageFormat.RGB:
        this.renderRGB(frame, renderingParameters, renderingProperties);
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

  private renderImagePixels(frame: Frame, renderingParameters: RenderingParameters,
                            renderingProperties: RenderingProperties): void {

    const { width, height } = this.canvas;
    const { columns, pixelData, rescaleIntercept, rescaleSlope, rows } = frame;
    const { zoom, windowWidth } = renderingParameters;
    const { boundedViewportSpace, leftLimit, rightLimit, imageSpace } = renderingProperties;
    const { imageX0, imageY0, imageWidth, imageHeight } = boundedViewportSpace;
    const { displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1 } = imageSpace;

    const table = this.lut.table;
    const imageData32 = new Uint32Array(displayWidth * displayHeight);

    let dataIndex = 0;

    for (let y = displayY0; y <= displayY1; y++) {
      for (let x = displayX0; x <= displayX1; x++) {
        const rawValue = pixelData[y * columns + x] * rescaleSlope + rescaleIntercept | 0;
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
    const imageDataInstance = new ImageData(imageData, displayWidth, displayHeight);

    this.renderingContext.canvas.width = displayWidth;
    this.renderingContext.canvas.height = displayHeight;

    this.renderingContext.putImageData(imageDataInstance, 0, 0);
    this.context.drawImage(this.renderingContext.canvas, imageX0, imageY0, imageWidth, imageHeight);
  }

  private renderRGB(frame: Frame, renderingParameters: RenderingParameters,
                    renderingProperties: RenderingProperties): void {

    const { columns, pixelData, rows } = frame;
    const { imageHeight, imageWidth, imageX0, imageY0 } = renderingProperties.viewportSpace;

    const pixelDataLength = pixelData.length;
    const imageData32 = new Uint32Array(columns * rows);

    let dataIndex = 0;

    for (let i = 0; i < pixelDataLength; i += 3) {
      imageData32[dataIndex++] = pixelData[i] | pixelData[i + 1] << 8 | pixelData[i + 2] << 16 | 255 << 24;
    }

    const imageData = new Uint8ClampedArray(imageData32.buffer);
    const imageDataInstance = new ImageData(imageData, columns, rows);

    this.renderingContext.canvas.width = columns;
    this.renderingContext.canvas.height = rows;

    this.renderingContext.putImageData(imageDataInstance, 0, 0);
    this.context.drawImage(this.renderingContext.canvas, imageX0, imageY0, imageWidth, imageHeight);
  }

  private renderViewportPixels(frame: Frame, renderingParameters: RenderingParameters,
                               renderingProperties: RenderingProperties): void {

    const { columns, pixelData, rescaleIntercept, rescaleSlope } = frame;
    const { zoom } = renderingParameters;
    const { boundedViewportSpace, leftLimit, rightLimit, viewportSpace } = renderingProperties;
    const { imageHeight, imageWidth, imageX0, imageX1, imageY0, imageY1 } = boundedViewportSpace;

    const viewportSpaceImageX0 = viewportSpace.imageX0;
    const viewportSpaceImageY0 = viewportSpace.imageY0;
    const table = this.lut.table;
    const imageData32 = new Uint32Array(imageWidth * imageHeight);

    let dataIndex = 0;

    for (let y = imageY0; y <= imageY1; y++) {
      for (let x = imageX0; x <= imageX1; x++) {
        const pixelDataIndex = ((y - viewportSpaceImageY0) / zoom | 0) * columns +
          ((x - viewportSpaceImageX0) / zoom | 0);
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
    const imageDataInstance = new ImageData(imageData, imageWidth, imageHeight);
    this.context.putImageData(imageDataInstance, imageX0, imageY0);
  }
}
