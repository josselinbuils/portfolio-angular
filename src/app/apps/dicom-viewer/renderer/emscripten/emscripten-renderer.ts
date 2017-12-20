import { RENDERER } from '../../constants';
import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';
import { createImageData, getRenderingProperties } from '../rendering-utils';

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
    this.loadRenderingCore(renderingCoreType);
    this.context = canvas.getContext('2d');
  }

  destroy(): void {
  }

  render(viewport: Viewport): void {

    if (!this.renderingCore) {
      return;
    }

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

    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, leftLimit, rightLimit, x0, y0,
    } = getRenderingProperties(viewport);

    const length: number = displayWidth * displayHeight * 4;

    if (length > 0) {
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
          displayY0, displayY1, viewport.zoom, leftLimit, rightLimit, rescaleSlope, rescaleIntercept,
        );

        const imageData: ImageData = createImageData(this.context, renderedData, displayWidth, displayHeight);
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

  private async loadRenderingCore(renderingCoreType: string): Promise<void> {
    try {
      this.renderingCore = await renderingCore[renderingCoreType]();
      this.fillTable = this.renderingCore.cwrap('fillTable', null, ['number', 'number']);
      this.coreRender = this.renderingCore.cwrap('render', null, [
        'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number',
        'number', 'number', 'number', 'number',
      ]);
    } catch (error) {
      throw this.handleEmscriptenErrors(error);
    }
  }
}
