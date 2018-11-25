import { NormalizedImageFormat } from '../../constants';
import { Dataset, Frame } from '../../models';
import { Renderer } from '../renderer';
import { RenderingParameters } from '../rendering-parameters';
import { BoundedViewportSpaceCoordinates, ImageSpaceCoordinates, RenderingProperties } from '../rendering-properties';
import { getRenderingProperties, validateCamera2D } from '../rendering-utils';

export class JsFrameRenderer implements Renderer {

  private readonly context: CanvasRenderingContext2D;
  private lut?: { table: number[]; windowWidth: number };
  private readonly renderingContext: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    const renderingContext = (document.createElement('canvas') as HTMLCanvasElement).getContext('2d');

    if (context === null || renderingContext === null) {
      throw new Error('Unable to retrieve contexts');
    }

    this.context = context;
    this.renderingContext = renderingContext;
  }

  render(dataset: Dataset, renderingParameters: RenderingParameters): void {
    const { width, height } = this.canvas;
    const { camera } = renderingParameters;
    const frame = dataset.findClosestFrame(camera.lookPoint);
    const { columns, imageFormat, rows } = frame;

    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, width, height);

    const zoom = height / frame.rows * camera.baseFieldOfView / camera.fieldOfView;
    // TODO put the real correction ratio
    const renderingProperties = getRenderingProperties(renderingParameters, zoom, columns, 1, 1, rows, width, height);

    if (!renderingProperties.isImageInViewport) {
      return;
    }

    validateCamera2D(frame, camera);

    switch (imageFormat) {
      case NormalizedImageFormat.Int16:
        const { windowWidth } = renderingParameters;

        if (this.lut === undefined || this.lut.windowWidth !== windowWidth) {
          this.lut = this.getVOILut(windowWidth);
        }

        if (zoom < 1) {
          this.renderViewportPixels(frame, renderingProperties, zoom);
        } else {
          this.renderImagePixels(frame, renderingProperties);
        }
        break;

      case NormalizedImageFormat.RGB:
        this.renderRGB(frame, renderingProperties);
        break;

      default:
        throw new Error('Unsupported image format');
    }
  }

  private getVOILut(windowWidth: number): VOILut {
    const table: number[] = [];

    for (let i = 0; i < windowWidth; i++) {
      table[i] = Math.floor(i / windowWidth * 256);
    }

    return { table, windowWidth };
  }

  private renderImagePixels(frame: Frame, renderingProperties: RenderingProperties): void {

    const { columns, pixelData, rescaleIntercept, rescaleSlope } = frame;
    const { boundedViewportSpace, leftLimit, rightLimit, imageSpace } = renderingProperties;
    const { imageX0, imageY0, imageWidth, imageHeight } = boundedViewportSpace as BoundedViewportSpaceCoordinates;
    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1,
    } = imageSpace as ImageSpaceCoordinates;

    const table = (this.lut as VOILut).table;
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

  private renderRGB(frame: Frame, renderingProperties: RenderingProperties): void {

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

  private renderViewportPixels(frame: Frame, renderingProperties: RenderingProperties, zoom: number): void {

    const { columns, pixelData, rescaleIntercept, rescaleSlope } = frame;
    const { boundedViewportSpace, leftLimit, rightLimit, viewportSpace } = renderingProperties;
    const {
      imageHeight, imageWidth, imageX0, imageX1, imageY0, imageY1,
    } = boundedViewportSpace as BoundedViewportSpaceCoordinates;

    const viewportSpaceImageX0 = viewportSpace.imageX0;
    const viewportSpaceImageY0 = viewportSpace.imageY0;
    const table = (this.lut as VOILut).table;
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

interface VOILut {
  table: number[];
  windowWidth: number;
}
