import { RENDERER } from '../../constants';
import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';

import { AsmRenderer } from './generated/asm-renderer';
import { WasmRenderer } from './generated/wasm-renderer';

const renderingCore: any = {};
renderingCore[RENDERER.ASM] = AsmRenderer;
renderingCore[RENDERER.WASM] = WasmRenderer;

export class EmscriptenRenderer implements Renderer {

  private context: CanvasRenderingContext2D;

  private coreRender: (table: number, rawImageData: number, renderedImageData: number, sliceWidth: number, x0: number,
                       y0: number, displayX0: number, displayX1: number, displayY0: number, displayY1: number,
                       zoom: number, leftLimit: number, rightLimit: number, rescaleSlope: number,
                       rescaleIntercept: number) => void;

  private fillTable: (table: number, windowWidth: number, invert: number) => void;
  private renderingCore: any;
  private lut: any;

  constructor(renderingCoreType: string, canvas: HTMLCanvasElement) {
    this.renderingCore = renderingCore[renderingCoreType]();
    this.fillTable = this.renderingCore.cwrap('fillTable', null, ['number', 'number']);
    this.coreRender = this.renderingCore.cwrap('render', null, [
      'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number',
      'number', 'number', 'number', 'number',
    ]);
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
        this.renderingCore._free(this.lut.table.byteOffset);
      }

      const pointer: number = this.renderingCore._malloc(viewport.windowWidth);
      const table: Uint8Array = new Uint8Array(this.renderingCore.HEAPU8.buffer, pointer, viewport.windowWidth);

      try {
        this.fillTable(table.byteOffset, viewport.windowWidth, 0);
      } catch (error) {
        throw this.handleEmscriptenErrors(error);
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

    const length: number = displayWidth * displayHeight * 4;

    if (length > 0) {
      const leftLimit: number = Math.floor(viewport.windowLevel - viewport.windowWidth / 2);
      const rightLimit: number = Math.floor(viewport.windowLevel + viewport.windowWidth / 2);

      try {
        const rawDataPointer: number = this.renderingCore._malloc(pixelData.byteLength);
        const rawData: Uint8Array = new Uint8Array(this.renderingCore.HEAPU8.buffer, rawDataPointer, pixelData.byteLength);
        rawData.set(new Uint8Array(pixelData.buffer, pixelData.byteOffset));

        const renderedDataLength: number = displayWidth * displayHeight * 4;
        const renderedDataPointer: number = this.renderingCore._malloc(renderedDataLength);
        const renderedData: Uint8ClampedArray = new Uint8ClampedArray(
          this.renderingCore.HEAPU8.buffer, renderedDataPointer, renderedDataLength,
        );

        this.coreRender(
          this.lut.table.byteOffset, rawData.byteOffset, renderedData.byteOffset, width, x0, y0, displayX0, displayX1,
          displayY0, displayY1, zoom, leftLimit, rightLimit, rescaleSlope, rescaleIntercept,
        );

        let imageData: ImageData;

        try {
          imageData = new ImageData(renderedData, displayWidth, displayHeight);
        } catch (e) {
          imageData = this.context.createImageData(displayWidth, displayHeight);
          imageData.data.set(renderedData);
        }

        this.context.putImageData(imageData, displayX0, displayY0);

        this.renderingCore._free(rawData.byteOffset);
        this.renderingCore._free(renderedData.byteOffset);

      } catch (error) {
        throw this.handleEmscriptenErrors(error);
      }
    }
  }

  resize(viewport: Viewport): void {
  }

  private handleEmscriptenErrors(error: Error | string): Error {
    if (typeof error === 'string') {
      console.error(error);
      error = new Error('Emscripten internal error, see browser console for more information');
    }
    return error;
  }
}
