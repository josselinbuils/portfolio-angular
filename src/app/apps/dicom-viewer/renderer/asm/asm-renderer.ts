import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';

declare const Module: any;

const fillTable: any = Module.cwrap('fillTable', null, ['number', 'number']);

const render: any = Module.cwrap('render', null, [
  'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number',
  'number', 'number', 'number', 'number',
]);

export class AsmRenderer implements Renderer {

  private context: CanvasRenderingContext2D;
  private lut: any;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  destroy(): void {
  }

  render(viewport: Viewport): void {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, viewport.width, viewport.height);

    const {height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width} = viewport.image;

    if (!this.lut || this.lut.windowWidth !== viewport.windowWidth) {

      if (this.lut) {
        Module._free(this.lut.table.byteOffset);
      }

      const pointer: number = Module._malloc(viewport.windowWidth);
      const table: Uint8Array = new Uint8Array(Module.HEAPU8.buffer, pointer, viewport.windowWidth);

      fillTable(table.byteOffset, viewport.windowWidth, 0);

      this.lut = {
        windowWidth: viewport.windowWidth,
        table,
      };
    }

    const zoom: number = viewport.height / height * viewport.zoom;
    const imageWidth: number = Math.round(width * zoom);
    const imageHeight: number = Math.round(height * zoom);

    const y0: number = Math.round(((viewport.height - imageHeight) / 2 + viewport.deltaY * viewport.height));
    const y1: number = y0 + imageHeight;

    const x0: number = Math.round(((viewport.width - imageWidth) / 2 + viewport.deltaX * viewport.width));
    const x1: number = x0 + imageWidth;

    const displayY0: number = Math.max(y0, 0);
    const displayY1: number = Math.min(y1, viewport.height - 1);

    const displayX0: number = Math.max(x0, 0);
    const displayX1: number = Math.min(x1, viewport.width - 1);

    const displayWidth: number = Math.max(displayX1 - displayX0, 0);
    const displayHeight: number = Math.max(displayY1 - displayY0, 0);

    const length: number = displayWidth * displayHeight * 4;

    const leftLimit: number = Math.floor(viewport.windowLevel - viewport.windowWidth / 2);
    const rightLimit: number = Math.floor(viewport.windowLevel + viewport.windowWidth / 2);

    const rawDataPointer: number = Module._malloc(pixelData.byteLength);
    const rawData: Uint8Array = new Uint8Array(Module.HEAPU8.buffer, rawDataPointer, pixelData.byteLength);
    rawData.set(new Uint8Array(pixelData.buffer, pixelData.byteOffset));

    const renderedDataLength: number = displayWidth * displayHeight * 4;
    const renderedDataPointer: number = Module._malloc(renderedDataLength);
    const renderedData: Uint8ClampedArray = new Uint8ClampedArray(Module.HEAPU8.buffer, renderedDataPointer, renderedDataLength);

    render(
      this.lut.table.byteOffset, rawData.byteOffset, renderedData.byteOffset, width, x0, y0, displayX0, displayX1,
      displayY0, displayY1, zoom, leftLimit, rightLimit, rescaleSlope, rescaleIntercept,
    );

    this.context.putImageData(new ImageData(renderedData, displayWidth, displayHeight), displayX0, displayY0);

    Module._free(rawData.byteOffset);
    Module._free(renderedData.byteOffset);
  }

  // noinspection TsLint
  resize(viewport: Viewport): void {
  }
}
