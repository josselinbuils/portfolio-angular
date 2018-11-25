import { math } from '../../helpers/maths-helpers';
import { Dataset } from '../../models';
import { Renderer } from '../renderer';
import { RenderingParameters } from '../rendering-parameters';
import { RenderingProperties } from '../rendering-properties';
import { getRenderingProperties } from '../rendering-utils';

export class JsVolumeRenderer implements Renderer {

  private readonly context: CanvasRenderingContext2D;
  private lut?: { table: number[]; windowWidth: number };
  private readonly renderingContext = (document.createElement('canvas') as HTMLCanvasElement).getContext('2d');

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  render(dataset: Dataset, renderingParameters: RenderingParameters): void {
    const { width, height } = this.canvas;
    const { camera } = renderingParameters;

    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, width, height);

    const sliceDimensions = dataset.volume.getSliceDimensions(camera.getBasis());
    const zoom = height / sliceDimensions.height * sliceDimensions.fieldOfView / camera.fieldOfView;
    const renderingProperties = getRenderingProperties(
      renderingParameters, zoom, sliceDimensions.width, sliceDimensions.widthRatio, sliceDimensions.heightRatio,
      sliceDimensions.height, width, height,
    );

    if (!renderingProperties.isImageInViewport) {
      return;
    }

    const { windowWidth } = renderingParameters;

    if (this.lut === undefined || this.lut.windowWidth !== windowWidth) {
      this.lut = this.getVOILut(windowWidth);
    }

    if (zoom < 1) {
      this.renderViewportPixels(
        dataset, renderingParameters, renderingProperties, zoom, sliceDimensions.width, sliceDimensions.height,
        sliceDimensions.widthRatio, sliceDimensions.heightRatio,
      );
    } else {
      this.renderImagePixels(
        dataset, renderingParameters, renderingProperties, sliceDimensions.width, sliceDimensions.height,
      );
    }
  }

  private getVOILut(windowWidth: number): { table: number[]; windowWidth: number } {
    const table: number[] = [];

    for (let i = 0; i < windowWidth; i++) {
      table[i] = Math.floor(i / windowWidth * 256);
    }

    return { table, windowWidth };
  }

  private getPixelValue(dataset: Dataset, pointLPS: number[]): number {
    const { firstVoxelCenter, orientation, voxelSpacing } = dataset.volume;

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

  private renderImagePixels(dataset: Dataset, renderingParameters: RenderingParameters,
                            renderingProperties: RenderingProperties, sliceWidth: number, sliceHeight: number): void {

    const { camera } = renderingParameters;
    const { boundedViewportSpace, leftLimit, rightLimit, imageSpace } = renderingProperties;
    const { imageX0, imageY0, imageWidth, imageHeight } = boundedViewportSpace;
    const { displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1 } = imageSpace;

    const table = this.lut.table;
    const imageData32 = new Uint32Array(displayWidth * displayHeight);

    let dataIndex = 0;

    // convertImageToLPS
    const cameraBasis = camera.getBasis();
    const right = math.chain(cameraBasis[0]).dotMultiply(dataset.volume.voxelSpacing).done();
    const up = math.chain(cameraBasis[1]).dotMultiply(dataset.volume.voxelSpacing).multiply(-1).done();
    const pointBaseLPS = math.chain(camera.lookPoint)
      .add(math.multiply(right, -(sliceWidth - 1) / 2))
      .add(math.multiply(up, -(sliceHeight - 1) / 2))
      .done() as number[];

    for (let y = displayY0; y <= displayY1; y++) {
      for (let x = displayX0; x <= displayX1; x++) {
        const pointLPS = [
          pointBaseLPS[0] + right[0] * x + up[0] * y,
          pointBaseLPS[1] + right[1] * x + up[1] * y,
          pointBaseLPS[2] + right[2] * x + up[2] * y,
        ];
        const rawValue = this.getPixelValue(dataset, pointLPS);
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

  private renderViewportPixels(dataset: Dataset, renderingParameters: RenderingParameters,
                               renderingProperties: RenderingProperties, zoom: number, sliceWidth: number,
                               sliceHeight: number, widthCorrectionRatio: number, heightCorrectionRatio: number): void {

    const { camera } = renderingParameters;
    const { boundedViewportSpace, leftLimit, rightLimit, viewportSpace } = renderingProperties;
    const { imageHeight, imageWidth, imageX0, imageX1, imageY0, imageY1 } = boundedViewportSpace;

    const viewportSpaceImageX0 = viewportSpace.imageX0;
    const viewportSpaceImageY0 = viewportSpace.imageY0;
    const table = this.lut.table;
    const imageData32 = new Uint32Array(imageWidth * imageHeight);

    let dataIndex = 0;

    // convertImageToLPS
    const cameraBasis = camera.getBasis();
    const right = math.chain(cameraBasis[0]).dotMultiply(dataset.volume.voxelSpacing).done();
    const up = math.chain(cameraBasis[1]).dotMultiply(dataset.volume.voxelSpacing).multiply(-1).done();
    const pointBaseLPS = math.chain(camera.lookPoint)
      .add(math.multiply(right, -(sliceWidth - 1) / 2))
      .add(math.multiply(up, -(sliceHeight - 1) / 2))
      .done() as number[];

    for (let y = imageY0; y <= imageY1; y++) {
      for (let x = imageX0; x <= imageX1; x++) {
        const pixX = (x - viewportSpaceImageX0) / zoom / widthCorrectionRatio | 0;
        const pixY = (y - viewportSpaceImageY0) / zoom / heightCorrectionRatio | 0;
        const pointLPS = [
          pointBaseLPS[0] + right[0] * pixX + up[0] * pixY,
          pointBaseLPS[1] + right[1] * pixX + up[1] * pixY,
          pointBaseLPS[2] + right[2] * pixX + up[2] * pixY,
        ];
        const rawValue = this.getPixelValue(dataset, pointLPS);
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
