import loadCoreRenderer from '../../../../../assets/wasm-renderer';

import { Renderer } from '../renderer';
import { RenderingParameters } from '../rendering-parameters';
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

  static async create(canvas: HTMLCanvasElement): Promise<WasmRenderer> {
    const renderer = new WasmRenderer(canvas);
    await renderer.loadRenderingCore();
    return renderer;
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  render(renderingParameters: RenderingParameters): void {

    if (this.renderingCore === undefined) {
      return;
    }

    const { width, height } = this.canvas;

    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, width, height);

    const {
      boundedViewportSpace, isImageInViewport, leftLimit, rightLimit, viewportSpace,
    } = getRenderingProperties(renderingParameters, width, height);

    if (!isImageInViewport) {
      return;
    }

    const { frame, zoom, windowWidth } = renderingParameters;
    const { columns, pixelData, rescaleIntercept, rescaleSlope } = frame;
    const { imageHeight, imageWidth, imageX0, imageX1, imageY0, imageY1 } = boundedViewportSpace;

    const viewportSpaceImageX0 = viewportSpace.imageX0;
    const viewportSpaceImageY0 = viewportSpace.imageY0;

    if (this.lut === undefined || this.lut.windowWidth !== windowWidth) {

      if (this.lut !== undefined) {
        this.renderingCore._free(this.lut.table.byteOffset);
      }

      const pointer = this.renderingCore._malloc(windowWidth) as number;
      const table = new Uint8Array(this.renderingCore.HEAPU8.buffer, pointer, windowWidth);

      try {
        this.fillTable(table.byteOffset, windowWidth);
      } catch (error) {
        throw this.handleEmscriptenErrors(error);
      }

      this.lut = { table, windowWidth };
    }

    try {
      const rawDataPointer = this.renderingCore._malloc(pixelData.byteLength) as number;
      const rawData = new Uint8Array(this.renderingCore.HEAPU8.buffer, rawDataPointer, pixelData.byteLength);
      rawData.set(new Uint8Array(pixelData.buffer, pixelData.byteOffset, pixelData.byteLength));

      const renderedDataLength = imageWidth * imageHeight * 4;
      const renderedDataPointer = this.renderingCore._malloc(renderedDataLength);
      const renderedData = new Uint8ClampedArray(
        this.renderingCore.HEAPU8.buffer, renderedDataPointer, renderedDataLength,
      );

      this.coreRender(
        this.lut.table.byteOffset, rawData.byteOffset, renderedData.byteOffset, columns, viewportSpaceImageX0,
        viewportSpaceImageY0, imageX0, imageX1, imageY0, imageY1, zoom, leftLimit, rightLimit, rescaleSlope,
        rescaleIntercept,
      );

      const imageData = new ImageData(renderedData, imageWidth, imageHeight);
      this.context.putImageData(imageData, imageX0, imageY0);

      this.renderingCore._free(rawData.byteOffset);
      this.renderingCore._free(renderedData.byteOffset);

    } catch (error) {
      throw this.handleEmscriptenErrors(error);
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
