import { V } from '../../math';
import { Dataset, Viewport, Volume } from '../../models';
import { convert } from '../../utils/coordinates';
import { Renderer } from '../renderer';
import { BoundedViewportSpaceCoordinates, ImageSpaceCoordinates, RenderingProperties } from '../rendering-properties';
import { getRenderingProperties } from '../rendering-utils';

export class JsVolumeRenderer implements Renderer {

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
    const { dataset, windowWidth } = viewport;

    if (dataset.volume === undefined) {
      throw new Error('Volume undefined');
    }

    const renderingProperties = getRenderingProperties(viewport);

    if (renderingProperties === undefined) {
      return;
    }

    if (this.lut === undefined || this.lut.windowWidth !== windowWidth) {
      this.lut = this.getVOILut(windowWidth);
    }

    const { boundedViewportSpace, imageSpace } = renderingProperties;
    const imagePixelsToRender = imageSpace.displayWidth * imageSpace.displayHeight;
    const viewportPixelsToRender = boundedViewportSpace.imageWidth * boundedViewportSpace.imageHeight;

    if (viewportPixelsToRender < imagePixelsToRender) {
      this.renderViewportPixels(viewport, renderingProperties);
    } else {
      this.renderImagePixels(viewport, renderingProperties);
    }
  }

  private getVOILut(windowWidth: number): VOILut {
    const table: number[] = [];

    for (let i = 0; i < windowWidth; i++) {
      table[i] = Math.floor(i / windowWidth * 256);
    }

    return { table, windowWidth };
  }

  private getPixelValue(dataset: Dataset, pointLPS: number[]): number {
    const { firstVoxelCenter, orientation, voxelSpacing } = dataset.volume as Volume;

    const vector = [
      (pointLPS[0] - firstVoxelCenter[0]) / voxelSpacing[0],
      (pointLPS[1] - firstVoxelCenter[1]) / voxelSpacing[1],
      (pointLPS[2] - firstVoxelCenter[2]) / voxelSpacing[2],
    ];

    const index = Math.round(
      vector[0] * orientation[2][0] + vector[1] * orientation[2][1] + vector[2] * orientation[2][2],
    );
    const frame = dataset.frames[index];

    if (frame === undefined) {
      return -Number.MAX_SAFE_INTEGER;
    }

    const {
      columns, imagePosition, imageOrientation, pixelData, rescaleIntercept, rescaleSlope, rows,
    } = frame;

    const imagePositionToPoint = [
      (pointLPS[0] - imagePosition[0]) / voxelSpacing[0],
      (pointLPS[1] - imagePosition[1]) / voxelSpacing[1],
      (pointLPS[2] - imagePosition[2]) / voxelSpacing[2],
    ];

    const i = (
      imagePositionToPoint[0] * imageOrientation[0][0] +
      imagePositionToPoint[1] * imageOrientation[0][1] +
      imagePositionToPoint[2] * imageOrientation[0][2]
    ) | 0;

    const j = (
      imagePositionToPoint[0] * imageOrientation[1][0] +
      imagePositionToPoint[1] * imageOrientation[1][1] +
      imagePositionToPoint[2] * imageOrientation[1][2]
    ) | 0;

    return i >= 0 && i < columns && j >= 0 && j < rows
      ? pixelData[j * columns + i] * rescaleSlope + rescaleIntercept
      : -Number.MAX_SAFE_INTEGER;
  }

  private renderImagePixels(viewport: Viewport, renderingProperties: RenderingProperties): void {

    const { camera, dataset } = viewport;
    const { boundedViewportSpace, imageSpace, leftLimit, rightLimit } = renderingProperties;
    const { imageX0, imageY0, imageWidth, imageHeight } = boundedViewportSpace as BoundedViewportSpaceCoordinates;
    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1,
    } = imageSpace as ImageSpaceCoordinates;

    const cameraBasis = camera.getWorldBasis();
    const voxelSpacing = (dataset.volume as Volume).voxelSpacing;
    const horizontalVoxelSpacing = Math.abs(V(voxelSpacing).dot(cameraBasis[0]));
    const verticalVoxelSpacing = Math.abs(V(voxelSpacing).dot(cameraBasis[1]));
    const xAxis = V(cameraBasis[0]).mul(horizontalVoxelSpacing);
    const yAxis = V(cameraBasis[1]).mul(verticalVoxelSpacing);
    const pointBaseLPS = convert([imageX0, imageY0, 0], viewport, dataset, dataset);

    const table = (this.lut as VOILut).table;
    const imageData32 = new Uint32Array(displayWidth * displayHeight);
    let dataIndex = 0;

    for (let y = displayY0; y <= displayY1; y++) {
      for (let x = displayX0; x <= displayX1; x++) {
        const pointLPS = [
          pointBaseLPS[0] + xAxis[0] * x + yAxis[0] * y,
          pointBaseLPS[1] + xAxis[1] * x + yAxis[1] * y,
          pointBaseLPS[2] + xAxis[2] * x + yAxis[2] * y,
        ];
        const rawValue = this.getPixelValue(dataset, pointLPS);
        let intensity = 250;

        if (rawValue < leftLimit) {
          intensity = 10;
        } else if (rawValue < rightLimit) {
          intensity = table[rawValue - leftLimit];
        }

        imageData32[dataIndex++] = intensity |
          intensity << 8 |
          intensity << 16 |
          (rawValue < -(Number.MAX_SAFE_INTEGER - 1) ? 0 : 255) << 24;
      }
    }

    const imageData = new Uint8ClampedArray(imageData32.buffer);
    const imageDataInstance = new ImageData(imageData, displayWidth, displayHeight);

    this.renderingContext.canvas.width = displayWidth;
    this.renderingContext.canvas.height = displayHeight;
    this.renderingContext.putImageData(imageDataInstance, 0, 0);
    this.context.drawImage(this.renderingContext.canvas, imageX0, imageY0, imageWidth, imageHeight);
  }

  private renderViewportPixels(viewport: Viewport, renderingProperties: RenderingProperties): void {

    const { camera, dataset } = viewport;
    const { boundedViewportSpace, imageSpace, leftLimit, rightLimit, viewportSpace, zoom } = renderingProperties;
    const {
      imageHeight, imageWidth, imageX0, imageX1, imageY0, imageY1,
    } = boundedViewportSpace as BoundedViewportSpaceCoordinates;
    const { displayWidth, displayHeight } = imageSpace as ImageSpaceCoordinates;

    const viewportSpaceImageX0 = viewportSpace.imageX0;
    const viewportSpaceImageY0 = viewportSpace.imageY0;
    const cameraBasis = camera.getWorldBasis();
    const voxelSpacing = (dataset.volume as Volume).voxelSpacing;
    const horizontalVoxelSpacing = Math.abs(V(voxelSpacing).dot(cameraBasis[0]));
    const verticalVoxelSpacing = Math.abs(V(voxelSpacing).dot(cameraBasis[1]));
    const xAxis = V(cameraBasis[0]).mul(horizontalVoxelSpacing);
    const yAxis = V(cameraBasis[1]).mul(verticalVoxelSpacing);
    const pointBaseLPS = convert([viewportSpaceImageX0, viewportSpaceImageY0, 0], viewport, dataset, dataset);

    xAxis.mul(displayWidth / imageWidth);
    yAxis.mul(displayHeight / imageHeight);

    const table = (this.lut as VOILut).table;
    const imageData32 = new Uint32Array(imageWidth * imageHeight);
    let dataIndex = 0;

    for (let y = imageY0; y <= imageY1; y++) {
      for (let x = imageX0; x <= imageX1; x++) {
        const pixX = (x - viewportSpaceImageX0) / zoom | 0;
        const pixY = (y - viewportSpaceImageY0) / zoom | 0;
        const pointLPS = [
          pointBaseLPS[0] + xAxis[0] * pixX + yAxis[0] * pixY,
          pointBaseLPS[1] + xAxis[1] * pixX + yAxis[1] * pixY,
          pointBaseLPS[2] + xAxis[2] * pixX + yAxis[2] * pixY,
        ];
        const rawValue = this.getPixelValue(dataset, pointLPS);
        let intensity = 255;

        if (rawValue < leftLimit) {
          intensity = 10;
        } else if (rawValue < rightLimit) {
          intensity = table[rawValue - leftLimit];
        }

        imageData32[dataIndex++] = intensity |
          intensity << 8 |
          intensity << 16 |
          (rawValue < -(Number.MAX_SAFE_INTEGER - 1) ? 0 : 255) << 24;
      }
    }

    const imageData = new Uint8ClampedArray(imageData32.buffer);
    const imageDataInstance = new ImageData(imageData, imageWidth, imageHeight);

    this.renderingContext.canvas.width = imageWidth;
    this.renderingContext.canvas.height = imageHeight;
    this.renderingContext.putImageData(imageDataInstance, 0, 0);
    this.context.drawImage(this.renderingContext.canvas, imageX0, imageY0, imageWidth, imageHeight);
  }
}

interface VOILut {
  table: number[];
  windowWidth: number;
}
