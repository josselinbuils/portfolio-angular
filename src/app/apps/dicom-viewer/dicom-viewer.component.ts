import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import 'rxjs/add/operator/toPromise';

import { MOUSE_BUTTON } from '../../constants';
import { WindowInstance } from '../../platform/window/window-instance';
import { WindowComponent } from '../../platform/window/window.component';

import { Config } from './config/config';
import { PHOTOMETRIC_INTERPRETATION, PIXEL_REPRESENTATION, RENDERER } from './constants';
import { Image } from './models/image';
import { Viewport } from './models/viewport';
import { CanvasRenderer } from './renderer/canvas/canvas-renderer';
import { EmscriptenRenderer } from './renderer/emscripten/emscripten-renderer';
import { JsRenderer } from './renderer/js/js-renderer';
import { Renderer } from './renderer/renderer';
import { WebGLRenderer } from './renderer/webgl/webgl-renderer';

const DELTA_LIMIT: number = 0.02;
const ZOOM_LIMIT: number = 0.07;
const ZOOM_MAX: number = 5;
const ZOOM_MIN: number = 0.2;
const ZOOM_SENSIBILITY: number = 3;
const WINDOW_LEVEL_SENSIBILITY: number = 3;
const WINDOW_WIDTH_SENSIBILITY: number = 5;
const WINDOW_WIDTH_MIN: number = 1;

@Component({
  selector: 'app-dicom-viewer',
  templateUrl: './dicom-viewer.component.html',
  styleUrls: ['./dicom-viewer.component.scss'],
})
export class DicomViewerComponent implements OnDestroy, WindowInstance {
  static appName = 'DICOM Viewer';
  static iconClass = 'fa-heartbeat';

  @ViewChild('viewportElement') viewportElementRef: ElementRef;
  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  canvas: HTMLCanvasElement;
  config: any = {};
  dicomProperties: any = {};
  errorMessage: string;
  fps = 0;
  loading: boolean = false;
  meanRenderDuration: number;
  showConfig: boolean = true;
  title = DicomViewerComponent.appName;
  viewport: Viewport;

  private frameDurations: number[];
  private lastTime: number = performance.now();
  private renderDurations: number[];
  private renderer: Renderer;
  private statsInterval: number;

  constructor(private http: HttpClient, private viewRenderer: Renderer2) {
  }

  back(): void {

    if (this.canvas) {
      this.viewRenderer.removeChild(this.viewportElementRef.nativeElement, this.canvas);
    }

    this.ngOnDestroy();

    delete this.errorMessage;
    delete this.dicomProperties;
    delete this.viewport;

    this.config = {};
    this.showConfig = true;
  }

  ngOnDestroy(): void {

    if (this.renderer) {
      this.renderer.destroy();
      delete this.renderer;
    }

    clearInterval(this.statsInterval);
  }

  onResize(size: { width: number; height: number }): void {
    const viewRenderer: Renderer2 = this.viewRenderer;
    const viewport: Viewport = this.viewport;

    size.height -= 42;

    if (viewRenderer && viewport) {
      viewRenderer.setAttribute(this.canvas, 'width', size.width.toString());
      viewRenderer.setAttribute(this.canvas, 'height', size.height.toString());

      viewport.width = size.width;
      viewport.height = size.height;

      if (this.renderer) {
        this.renderer.resize(viewport);
      }
    }
  }

  async start(config: Config): Promise<void> {
    this.config = config;
    this.showConfig = false;
    this.loading = true;

    try {
      this.dicomProperties = this.getDicomProperties(await this.getDicomData(this.config.dataset.fileName));
    } catch (error) {
      this.handleError(error);
    }

    console.log(this.dicomProperties);

    const {
      height, imageFormat, pixelRepresentation, rescaleIntercept, rescaleSlope, width, windowLevel, windowWidth,
    } = this.dicomProperties;

    let {pixelData} = this.dicomProperties;

    const renderer: any = {};
    renderer[RENDERER.ASM] = EmscriptenRenderer.bind(this, RENDERER.ASM);
    renderer[RENDERER.CANVAS] = CanvasRenderer;
    renderer[RENDERER.JS] = JsRenderer;
    renderer[RENDERER.WASM] = EmscriptenRenderer.bind(this, RENDERER.WASM);
    renderer[RENDERER.WEBGL] = WebGLRenderer;

    this.canvas = this.viewRenderer.createElement('canvas');
    this.viewRenderer.appendChild(this.viewportElementRef.nativeElement, this.canvas);
    this.viewRenderer.listen(this.canvas, 'mousedown', this.startTool.bind(this));

    try {
      this.renderer = new renderer[this.config.rendererType](this.canvas);
    } catch (error) {
      this.handleError(new Error(`Unable to instantiate ${this.config.rendererType} renderer: ${error.message}`));
    }

    if (this.config.rendererType !== RENDERER.WEBGL) {
      const arrayType: any = {
        int8: Int8Array,
        int16: Int16Array,
        uint8: Uint8Array,
        uint16: Uint16Array,
      };
      pixelData = new arrayType[imageFormat](pixelData.buffer, pixelData.byteOffset);
    }

    if ([RENDERER.ASM, RENDERER.WASM].includes(this.config.rendererType)) {
      pixelData = new Int32Array(pixelData);
    }

    const image: Image = new Image({height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width});

    this.viewport = new Viewport({image, windowLevel, windowWidth});

    const windowNativeElement: HTMLElement = this.windowComponent.windowElementRef.nativeElement;

    this.onResize({
      width: windowNativeElement.clientWidth,
      height: windowNativeElement.clientHeight,
    });

    this.viewport.zoom = 0.91; // Math.min(this.viewport.height / image.height, 1);
    this.windowComponent.maximize();

    setTimeout(() => this.startBenchmark(), 3000);

    this.loading = false;
    this.startRender();
  }

  startBenchmark(): void {
    clearInterval(this.statsInterval);
    this.frameDurations = [];
    this.renderDurations = [];

    setTimeout(() => {

      const meanFrameDuration: number = this.frameDurations
        .reduce((sum: number, d: number) => sum + d, 0) / this.frameDurations.length;

      const meanRenderDuration: number = this.renderDurations
        .reduce((sum: number, d: number) => sum + d, 0) / this.renderDurations.length;

      const res: any = {
        meanFrameDuration: meanFrameDuration.toString().replace('.', ','),
        meanRenderDuration: meanRenderDuration.toString().replace('.', ','),
        rendererType: this.config.rendererType,
        dataset: this.config.dataset.name,
        imageWidth: this.viewport.image.width,
        imageHeight: this.viewport.image.height,
        zoom: this.viewport.zoom,
        viewportWidth: this.viewport.width,
        viewportHeight: this.viewport.height,
      };

      setTimeout(() => console.log(res), 3000);

      this.back();

    }, 15000);
  }

  startPan(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const canvas: HTMLCanvasElement = this.canvas;
    const viewport: Viewport = this.viewport;
    const startX: number = downEvent.clientX - viewport.deltaX * canvas.clientWidth;
    const startY: number = downEvent.clientY - viewport.deltaY * canvas.clientHeight;

    const cancelMouseMove: () => void = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {

      viewport.deltaX = (moveEvent.clientX - startX) / canvas.clientWidth;
      viewport.deltaY = (moveEvent.clientY - startY) / canvas.clientHeight;

      // noinspection JSSuspiciousNameCombination
      if (Math.abs(viewport.deltaX) < DELTA_LIMIT && Math.abs(viewport.deltaY) < DELTA_LIMIT) {
        viewport.deltaX = viewport.deltaY = 0;
      }
    });

    const cancelMouseUp: () => void = this.viewRenderer.listen('window', 'mouseup', () => {
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  startTool(downEvent: MouseEvent): void {
    switch (downEvent.button) {
      case MOUSE_BUTTON.LEFT:
        this.startWindowing(downEvent);
        break;
      case MOUSE_BUTTON.MIDDLE:
        this.startPan(downEvent);
        break;
      case MOUSE_BUTTON.RIGHT:
        this.startZoom(downEvent);
    }
  }

  startZoom(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const isMacOS: boolean = navigator.platform.indexOf('Mac') !== -1;
    const viewport: Viewport = this.viewport;
    const startY: number = downEvent.clientY;
    const startZoom: number = viewport.zoom;

    const cancelMouseMove: () => void = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      viewport.zoom = startZoom - (moveEvent.clientY - startY) * ZOOM_SENSIBILITY / this.canvas.clientHeight;
      viewport.zoom = Math.min(Math.max(viewport.zoom, ZOOM_MIN), ZOOM_MAX);

      // Helps to set zoom at 1 or to fit window
      [1, viewport.height / viewport.image.height].forEach((zoom: number) => {
        if (Math.abs(viewport.zoom - zoom) < ZOOM_LIMIT) {
          viewport.zoom = zoom;
        }
      });
    });

    const cancelContextMenu: () => void = this.viewRenderer.listen('window', 'contextmenu', () => {
      if (!isMacOS) {
        cancelMouseMove();
      }
      cancelContextMenu();

      return false;
    });

    if (isMacOS) {
      const cancelMouseUp: () => void = this.viewRenderer.listen('window', 'mouseup', () => {
        cancelMouseMove();
        cancelMouseUp();
      });
    }
  }

  startWindowing(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const startX: number = downEvent.clientX;
    const startY: number = downEvent.clientY;

    const startWindowWidth: number = this.viewport.windowWidth;
    const startWindowLevel: number = this.viewport.windowLevel;

    const cancelMouseMove: () => void = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.viewport.windowWidth = startWindowWidth + (moveEvent.clientX - startX) * WINDOW_WIDTH_SENSIBILITY;
      this.viewport.windowLevel = startWindowLevel - (moveEvent.clientY - startY) * WINDOW_LEVEL_SENSIBILITY;
      this.viewport.windowWidth = Math.max(this.viewport.windowWidth, WINDOW_WIDTH_MIN);
    });

    const cancelMouseUp: () => void = this.viewRenderer.listen('window', 'mouseup', () => {
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private async getDicomData(dataset: string): Promise<Uint8Array> {
    try {
      const dicomData: ArrayBuffer = await this.http
        .get(`/assets/dicom/${dataset}`, {responseType: 'arraybuffer'})
        .toPromise();

      return new Uint8Array(dicomData);

    } catch (error) {
      throw new Error(`Unable to retrieve DICOM file: ${error.message}`);
    }
  }

  private getDicomProperties(rawDicomData: Uint8Array): any {
    let dataset: any;

    try {
      dataset = (<any> window).dicomParser.parseDicom(rawDicomData);
    } catch (error) {
      throw new Error(`Unable to parse dicom: ${error.message || error}`);
    }

    try {
      const bitsAllocated: number = dataset.uint16('x00280100');
      const height: number = dataset.uint16('x00280010');
      const patientName: string = dataset.string('x00100010');
      const photometricInterpretation: string = dataset.string('x00280004');
      const pixelRepresentation: number = dataset.uint16('x00280103');
      const rescaleIntercept: number = dataset.intString('x00281052') || 0;
      const rescaleSlope: number = dataset.floatString('x00281053') || 1;
      const width: number = dataset.uint16('x00280011');
      const windowLevel: number = dataset.intString('x00281050') || 30;
      const windowWidth: number = dataset.intString('x00281051') || 400;

      const imageFormat: string = this.getImageFormat(bitsAllocated, photometricInterpretation, pixelRepresentation);

      const pixelDataElement: any = dataset.elements.x7fe00010;
      const pixelData: Uint8Array = (<any> window).dicomParser.sharedCopy(
        rawDicomData, pixelDataElement.dataOffset, pixelDataElement.length,
      );

      return {
        bitsAllocated, height, imageFormat, patientName, photometricInterpretation, pixelData, pixelRepresentation,
        rescaleIntercept, rescaleSlope, width, windowLevel, windowWidth,
      };

    } catch (error) {
      throw new Error(`Unable to parse dicom: ${error.message || error}`);
    }
  }

  private getImageFormat(bitsAllocated: number, photometricInterpretation: string, pixelRepresentation: number): string {
    let format: string = '';

    if (photometricInterpretation === PHOTOMETRIC_INTERPRETATION.RGB) {
      format = 'rgb';
    } else if (photometricInterpretation.indexOf('MONOCHROME') === 0) {
      if (pixelRepresentation === PIXEL_REPRESENTATION.UNSIGNED) {
        format += 'u';
      }
      format += `int${bitsAllocated <= 8 ? '8' : '16'}`;
    } else {
      throw new Error('Unsupported photometric interpretation');
    }

    return format;
  }

  private handleError(error: Error): Error {
    this.errorMessage = error.message;

    if (this.loading) {
      this.loading = false;
    }

    return error;
  }

  private startRender(): void {
    const {width, height} = this.dicomProperties;

    const render: () => void = (): void => {

      if (!this.renderer) {
        return;
      }

      if (this.windowComponent.active) {
        const t: number = performance.now();

        try {
          this.renderer.render(this.viewport);
        } catch (error) {
          console.error(error);
          this.handleError(new Error(`Unable to render viewport: ${error.message}`));
          return;
        }

        this.renderDurations.push(performance.now() - t);
        this.frameDurations.push(t - this.lastTime);
        this.lastTime = t;
      }

      window.requestAnimationFrame(render);
    };

    this.frameDurations = [];
    this.renderDurations = [];

    this.statsInterval = window.setInterval(() => {
      if (this.frameDurations.length > 0) {
        const meanFrameDuration: number = this.frameDurations
          .reduce((sum: number, d: number) => sum + d, 0) / this.frameDurations.length;
        this.fps = Math.round(1000 / meanFrameDuration);
        this.frameDurations = [];
      } else {
        this.fps = 0;
      }

      if (this.renderDurations.length > 0) {
        this.meanRenderDuration = this.renderDurations
          .reduce((sum: number, d: number) => sum + d, 0) / this.renderDurations.length;
        this.renderDurations = [];
      } else {
        this.meanRenderDuration = 0;
      }
    }, 500);

    render();
  }
}
