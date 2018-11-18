import loadCoreRenderer from '../../../../../assets/wasm-renderer';

import { Viewport } from '../../models';
import { Renderer } from '../renderer';
import { getRenderingProperties } from '../rendering-utils';

export class WasmRenderer implements Renderer {

  private readonly context: CanvasRenderingContext2D;

  private coreRender: (table: number, rawImageData: number, renderedImageData: number, sliceWidth: number, x0: number,
                       y0: number, displayX0: number, displayX1: number, displayY0: number, displayY1: number,
                       zoom: number, leftLimit: number, rightLimit: number, rescaleSlope: number,
                       rescaleIntercept: number) => void;

  private fillTable: (table: number, windowWidth: number) => void;
  private renderingCore: RenderingCore;
  private lut?: { table: Uint8Array; windowWidth: number };

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  async init(): Promise<void> {
    await this.loadRenderingCore();
  }

  render(viewport: Viewport): void {

    if (this.renderingCore === undefined) {
      return;
    }

    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, viewport.width, viewport.height);

    const { columns, pixelData, rescaleIntercept, rescaleSlope } = viewport.image;

    if (this.lut === undefined || this.lut.windowWidth !== viewport.windowWidth) {

      if (this.lut !== undefined) {
        this.renderingCore._free(this.lut.table.byteOffset);
      }

      const pointer = this.renderingCore._malloc(viewport.windowWidth) as number;
      const table = new Uint8Array(this.renderingCore.HEAPU8.buffer, pointer, viewport.windowWidth);

      try {
        this.fillTable(table.byteOffset, viewport.windowWidth);
      } catch (error) {
        throw this.handleEmscriptenErrors(error);
      }

      this.lut = {
        windowWidth: viewport.windowWidth, table,
      };
    }

    const {
      displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, leftLimit, rightLimit, x0, y0,
    } = getRenderingProperties(viewport);

    const length = displayWidth * displayHeight;

    if (length > 0) {
      try {
        const rawDataPointer = this.renderingCore._malloc(pixelData.byteLength) as number;
        const rawData = new Uint8Array(this.renderingCore.HEAPU8.buffer, rawDataPointer, pixelData.byteLength);
        rawData.set(new Uint8Array(pixelData.buffer, pixelData.byteOffset, pixelData.byteLength));

        const renderedDataLength = displayWidth * displayHeight * 4;
        const renderedDataPointer = this.renderingCore._malloc(renderedDataLength);
        const renderedData = new Uint8ClampedArray(
          this.renderingCore.HEAPU8.buffer, renderedDataPointer, renderedDataLength,
        );

        this.coreRender(this.lut.table.byteOffset, rawData.byteOffset, renderedData.byteOffset, columns, x0, y0,
          displayX0, displayX1, displayY0, displayY1, viewport.zoom, leftLimit, rightLimit, rescaleSlope,
          rescaleIntercept);

        const imageData = new ImageData(renderedData, displayWidth, displayHeight);
        this.context.putImageData(imageData, displayX0, displayY0);

        this.renderingCore._free(rawData.byteOffset);
        this.renderingCore._free(renderedData.byteOffset);

      } catch (error) {
        throw this.handleEmscriptenErrors(error);
      }
    }
  }

  private handleEmscriptenErrors(error: Error | string): Error {
    if (typeof error === 'string') {
      console.error(error);
      error = new Error('Emscripten internal error, see browser console for more information');
    }
    return error;
  }

  private async loadRenderingCore(): Promise<void> {
    try {
      this.renderingCore = await new Promise<RenderingCore>(resolve => {
        loadCoreRenderer().then(module => {
          delete module.then;
          resolve(module);
        });
      });
      this.fillTable = this.renderingCore.cwrap('fillTable', null, ['number', 'number']);
      this.coreRender = this.renderingCore.cwrap('render', null, (new Array(15)).fill('number'));
    } catch (error) {
      throw this.handleEmscriptenErrors(error);
    }
  }
}

interface RenderingCore {
  HEAPU8: Uint8Array;

  cwrap(...args: any[]): (...args: any[]) => any;

  _free(pointer: number): void;

  _malloc(size: number): number;
}
