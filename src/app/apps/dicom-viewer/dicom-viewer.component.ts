import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { parseDicom, sharedCopy } from 'dicom-parser';
import 'rxjs/add/operator/toPromise';

import { MOUSE_BUTTON } from '../../constants';
import { WindowInstance } from '../../platform/window/window-instance';
import { WindowComponent } from '../../platform/window/window.component';

import { PHOTOMETRIC_INTERPRETATION, PIXEL_REPRESENTATION } from './constants';
import { Image } from './models/image';
import { Viewport } from './models/viewport';
import { CanvasRenderer } from './renderer/canvas/canvas-renderer';
import { Renderer } from './renderer/renderer';
import { WebGLRenderer } from './renderer/webgl/webgl-renderer';

const DATASET: string = 'CT-MONO2-16-brain';
const DELTA_LIMIT: number = 0.02;
const MIN_WINDOW_WIDTH: number = 1;
const ZOOM_LIMIT: number = 0.07;
const ZOOM_SENSIBILITY: number = 3;
const WINDOWING_SENSIBILITY: number = 5;

@Component({
  selector: 'app-dicom-viewer',
  templateUrl: './dicom-viewer.component.html',
  styleUrls: ['./dicom-viewer.component.scss'],
})
export class DicomViewerComponent implements AfterContentInit, WindowInstance {
  static appName = 'DICOM Viewer';
  static iconClass = 'fa-heartbeat';

  @ViewChild('canvas') canvasElementRef: ElementRef;
  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  canvas: HTMLElement;
  dicomProperties: any = {};
  fps = 0;
  image: Image;
  meanRenderDuration: number;
  rendererType: string;
  title = DicomViewerComponent.appName;
  viewport: Viewport;

  private frameDurations: number[] = [];
  private lastTime: number = performance.now();
  private renderDurations: number[] = [];
  private renderer: Renderer;

  constructor(private http: HttpClient, private viewRenderer: Renderer2) {
  }

  async ngAfterContentInit(): Promise<any> {
    const canvas: HTMLCanvasElement = this.canvasElementRef.nativeElement;

    this.dicomProperties = getDicomProperties(await this.getDicomData());

    const {
      height, imageFormat, pixelData, pixelRepresentation, rescaleIntercept, rescaleSlope, width, windowLevel,
      windowWidth,
    } = this.dicomProperties;

    if (!(<any> window).canvasRenderer) {
      this.renderer = new CanvasRenderer(canvas);
      this.rendererType = 'canvas';
      (<any> window).canvasRenderer = true;
    } else {
      this.renderer = new WebGLRenderer(canvas);
      this.rendererType = 'webgl';
    }

    let imageData: Uint8Array = pixelData;

    if (this.rendererType === 'canvas') {
      const arrayType: any = {
        int8: Int8Array,
        int16: Int16Array,
        uint8: Uint8Array,
        uint16: Uint16Array,
      };
      imageData = new arrayType[imageFormat](pixelData.buffer);
    }

    const image: Image = new Image({
      height, imageFormat, pixelData: imageData, rescaleIntercept, rescaleSlope, width,
    });

    this.image = image;
    this.viewport = new Viewport({image, windowLevel, windowWidth});

    this.onResize({
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    });

    this.startRender();

    setInterval(() => {

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
  }

  onResize(size: { width: number; height: number }): void {
    const viewRenderer: Renderer2 = this.viewRenderer;
    const viewport: Viewport = this.viewport;

    size.height -= 42;

    if (viewRenderer && viewport) {
      viewRenderer.setAttribute(this.canvasElementRef.nativeElement, 'width', size.width.toString());
      viewRenderer.setAttribute(this.canvasElementRef.nativeElement, 'height', size.height.toString());

      viewport.width = size.width;
      viewport.height = size.height;

      if (this.renderer) {
        this.renderer.resize(viewport);
      }
    }
  }

  startPan(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const canvas: HTMLCanvasElement = this.canvasElementRef.nativeElement;
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

    const canvas: HTMLCanvasElement = this.canvasElementRef.nativeElement;
    const viewport: Viewport = this.viewport;
    const startY: number = downEvent.clientY;
    const startZoom: number = viewport.zoom;

    const cancelMouseMove: () => void = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {

      viewport.zoom = Math.max(startZoom - (moveEvent.clientY - startY) * ZOOM_SENSIBILITY / canvas.clientHeight, 0.5);

      if (Math.abs(viewport.zoom - 1) < ZOOM_LIMIT) {
        viewport.zoom = 1;
      }
    });

    const cancelContextMenu: () => void = this.viewRenderer.listen('window', 'contextmenu', () => {
      cancelMouseMove();
      cancelContextMenu();

      return false;
    });
  }

  startWindowing(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const cancelMouseMove: () => void = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.viewport.windowLevel -= moveEvent.movementY * WINDOWING_SENSIBILITY;
      this.viewport.windowWidth += moveEvent.movementX * WINDOWING_SENSIBILITY;
      this.viewport.windowWidth = Math.max(this.viewport.windowWidth, MIN_WINDOW_WIDTH);
    });

    const cancelMouseUp: () => void = this.viewRenderer.listen('window', 'mouseup', () => {
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private async getDicomData(): Promise<Uint8Array> {
    try {
      const dicomData: ArrayBuffer = await this.http
        .get(`/assets/dicom/${DATASET}`, {responseType: 'arraybuffer'})
        .toPromise();

      return new Uint8Array(dicomData);

    } catch (e) {
      console.error(e);
      throw new Error('Unable to retrieve DICOM file');
    }
  }

  private startRender(): void {
    const {width, height} = this.dicomProperties;

    const render: () => void = (): void => {
      if (this.windowComponent.active) {

        const t: number = performance.now();
        this.frameDurations.push(t - this.lastTime);
        this.lastTime = t;

        this.renderer.render(this.viewport);

        this.renderDurations.push(performance.now() - t);
      }
      requestAnimationFrame(render);
    };

    render();
  }
}

function getDicomProperties(rawDicomData: Uint8Array): any {
  try {
    const dataset: any = parseDicom(rawDicomData);
    const bitsAllocated: number = dataset.uint16('x00280100');
    const height: number = dataset.uint16('x00280010');
    const patientName: string = dataset.string('x00100010');
    const photometricInterpretation: string = dataset.string('x00280004');
    const pixelRepresentation: number = dataset.uint16('x00280103');
    const rescaleIntercept: number = dataset.intString('x00281052');
    const rescaleSlope: number = dataset.floatString('x00281053');
    const width: number = dataset.uint16('x00280011');
    const windowLevel: number = dataset.intString('x00281050') || 30;
    const windowWidth: number = dataset.intString('x00281051') || 400;

    const pixelDataElement: any = dataset.elements.x7fe00010;
    const pixelData: Uint8Array = sharedCopy(rawDicomData, pixelDataElement.dataOffset, pixelDataElement.length);
    const imageFormat: string = getImageFormat(bitsAllocated, photometricInterpretation, pixelRepresentation);

    return {
      bitsAllocated,
      height,
      imageFormat,
      patientName,
      photometricInterpretation,
      pixelData,
      pixelRepresentation,
      rescaleIntercept,
      rescaleSlope,
      width,
      windowLevel,
      windowWidth,
    };

  } catch (e) {
    console.error(e);
    throw new Error('Unable to parse dicom');
  }
}

function getImageFormat(bitsAllocated: number, photometricInterpretation: string, pixelRepresentation: number): string {
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
