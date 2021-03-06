import { NormalizedImageFormat } from '../../constants';
import { Frame, Viewport } from '../../models';
import { Renderer } from '../renderer';
import { BoundedViewportSpaceCoordinates, ImageSpaceCoordinates, RenderingProperties } from '../rendering-properties';
import { getRenderingProperties, validateCamera2D } from '../rendering-utils';

import { drawImageData, getVOILut, VOILut } from './js-common';

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

  render(viewport: Viewport): void {
    const { camera, dataset, height, width, windowWidth } = viewport;
    // TODO get it through rendering properties
    const frame = dataset.findClosestFrame(camera.lookPoint);
    const { imageFormat } = frame;

    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, width, height);

    const renderingProperties = getRenderingProperties(viewport);

    if (renderingProperties === undefined) {
      return;
    }

    validateCamera2D(frame, camera);

    switch (imageFormat) {
      case NormalizedImageFormat.Int16:
        if (this.lut === undefined || this.lut.windowWidth !== windowWidth) {
          this.lut = getVOILut(windowWidth);
        }

        const { boundedViewportSpace, imageSpace } = renderingProperties;
        const imagePixelsToRender = imageSpace.displayWidth * imageSpace.displayHeight;
        const viewportPixelsToRender = boundedViewportSpace.imageWidth * boundedViewportSpace.imageHeight;

        if (viewportPixelsToRender < imagePixelsToRender) {
          this.renderViewportPixels(frame, renderingProperties, viewport.getImageZoom());
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

  private getPixelValue(rawValue: number, leftLimit: number, rightLimit: number): number {
    let intensity = 255;

    if (rawValue < leftLimit) {
      intensity = 0;
    } else if (rawValue < rightLimit) {
      intensity = (this.lut as VOILut).table[rawValue - leftLimit];
    }

    return intensity | intensity << 8 | intensity << 16 | 255 << 24;
  }

  private renderImagePixels(frame: Frame, renderingProperties: RenderingProperties): void {

    const { columns, pixelData, rescaleIntercept, rescaleSlope } = frame;
    const { boundedViewportSpace, leftLimit, rightLimit, imageSpace } = renderingProperties;
    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1,
    } = imageSpace as ImageSpaceCoordinates;

    const imageData32 = new Uint32Array(displayWidth * displayHeight);

    let dataIndex = 0;

    for (let y = displayY0; y <= displayY1; y++) {
      for (let x = displayX0; x <= displayX1; x++) {
        const rawValue = pixelData[y * columns + x] * rescaleSlope + rescaleIntercept | 0;
        imageData32[dataIndex++] = this.getPixelValue(rawValue, leftLimit, rightLimit);
      }
    }

    drawImageData(imageData32, this.context, this.renderingContext, displayWidth, displayHeight, boundedViewportSpace);
  }

  private renderRGB(frame: Frame, renderingProperties: RenderingProperties): void {

    const { columns, pixelData, rows } = frame;
    const { viewportSpace } = renderingProperties;

    const pixelDataLength = pixelData.length;
    const imageData32 = new Uint32Array(columns * rows);

    let dataIndex = 0;

    for (let i = 0; i < pixelDataLength; i += 3) {
      imageData32[dataIndex++] = pixelData[i] | pixelData[i + 1] << 8 | pixelData[i + 2] << 16 | 255 << 24;
    }

    drawImageData(imageData32, this.context, this.renderingContext, columns, rows, viewportSpace);
  }

  private renderViewportPixels(frame: Frame, renderingProperties: RenderingProperties, zoom: number): void {

    const { columns, pixelData, rescaleIntercept, rescaleSlope } = frame;
    const { boundedViewportSpace, leftLimit, rightLimit, viewportSpace } = renderingProperties;
    const {
      imageHeight, imageWidth, imageX0, imageX1, imageY0, imageY1,
    } = boundedViewportSpace as BoundedViewportSpaceCoordinates;

    const viewportSpaceImageX0 = viewportSpace.imageX0;
    const viewportSpaceImageY0 = viewportSpace.imageY0;
    const imageData32 = new Uint32Array(imageWidth * imageHeight);

    let dataIndex = 0;

    for (let y = imageY0; y <= imageY1; y++) {
      for (let x = imageX0; x <= imageX1; x++) {
        const imageX = (x - viewportSpaceImageX0) / zoom | 0;
        const imageY = (y - viewportSpaceImageY0) / zoom | 0;
        const rawValue = pixelData[imageY * columns + imageX] * rescaleSlope + rescaleIntercept | 0;
        imageData32[dataIndex++] = this.getPixelValue(rawValue, leftLimit, rightLimit);
      }
    }

    drawImageData(imageData32, this.context, this.renderingContext, imageWidth, imageHeight, boundedViewportSpace);
  }
}
