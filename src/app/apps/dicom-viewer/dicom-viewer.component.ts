import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { parseDicom, sharedCopy } from 'dicom-parser';
import 'rxjs/add/operator/toPromise';

import { MOUSE_BUTTON } from '../../constants';
import { PHOTOMETRIC_INTERPRETATION, PIXEL_REPRESENTATION } from './constants';
import { CanvasRenderer } from './renderer/canvas/canvas-renderer';
import { Image } from './models/image';
import { Renderer } from './renderer/renderer';
import { WindowInstance } from '../../platform/window/window-instance';
import { WindowComponent } from '../../platform/window/window.component';
import { Viewport } from './models/viewport';
import { WebGLRenderer } from './renderer/webgl/webgl-renderer';

const DELTA_LIMIT = 0.02;
const ZOOM_LIMIT = 0.07;
const ZOOM_SENSIBILITY = 3;
const WINDOWING_SENSIBILITY = 5;

@Component({
  selector: 'app-dicom-viewer',
  templateUrl: './dicom-viewer.component.html',
  styleUrls: ['./dicom-viewer.component.scss']
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
  title = DicomViewerComponent.appName;
  viewport: Viewport;

  private frameDurations: number[] = [];
  private lastTime: number = performance.now();
  private renderDurations: number[] = [];
  private renderer: Renderer;

  constructor(private http: HttpClient, private viewRenderer: Renderer2) {
  }

  onResize(size: { width: number, height: number }) {
    const viewRenderer = this.viewRenderer;
    const viewport = this.viewport;

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

    const canvas = this.canvasElementRef.nativeElement;
    const viewport = this.viewport;
    const startX: number = downEvent.clientX - viewport.deltaX * canvas.clientWidth;
    const startY: number = downEvent.clientY - viewport.deltaY * canvas.clientHeight;

    const cancelMouseMove = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {

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
        break;
    }
  }

  startZoom(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const canvas = this.canvasElementRef.nativeElement;
    const viewport = this.viewport;
    const startY = downEvent.clientY;
    const startZoom = viewport.zoom;

    const cancelMouseMove = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {

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

    const cancelMouseMove = this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.viewport.windowLevel -= moveEvent.movementY * WINDOWING_SENSIBILITY;
      this.viewport.windowWidth += moveEvent.movementX * WINDOWING_SENSIBILITY;
    });

    const cancelMouseUp: () => void = this.viewRenderer.listen('window', 'mouseup', () => {
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private async getDicomData(): Promise<Uint8Array> {
    try {
      return new Uint8Array(await this.http.get('/assets/dicom/CT-MONO2-16-ankle', {responseType: 'arraybuffer'}).toPromise());
    } catch (e) {
      console.error(e);
      throw new Error('Unable to retrieve DICOM file');
    }
  }

  private getImageFormat(bitsAllocated: number, photometricInterpretation: string, pixelRepresentation: number): string {
    let format = '';

    if (photometricInterpretation === PHOTOMETRIC_INTERPRETATION.RGB) {
      format = 'rgb';
    } else if (photometricInterpretation.indexOf('MONOCHROME') === 0) {
      if (pixelRepresentation === PIXEL_REPRESENTATION.UNSIGNED) {
        format += 'u';
      }
      format += 'int' + (bitsAllocated <= 8 ? '8' : '16');
    } else {
      throw new Error('Unsupported photometric interpretation');
    }

    return format;
  }

  private parseDicom(rawDicomData: Uint8Array): any {
    try {
      const dataset = parseDicom(rawDicomData);
      const bitsAllocated = dataset.uint16('x00280100');
      const height = dataset.uint16('x00280010');
      const patientName = dataset.string('x00100010');
      const photometricInterpretation = dataset.string('x00280004');
      const pixelRepresentation = dataset.uint16('x00280103');
      const rescaleIntercept = dataset.intString('x00281052');
      const rescaleSlope = dataset.floatString('x00281053');
      const width = dataset.uint16('x00280011');
      const windowLevel = dataset.intString('x00281050') || 400;
      const windowWidth = dataset.intString('x00281051') || 30;

      const pixelDataElement = dataset.elements.x7fe00010;
      let pixelData = sharedCopy(rawDicomData, pixelDataElement.dataOffset, pixelDataElement.length);

      const imageFormat = this.getImageFormat(bitsAllocated, photometricInterpretation, pixelRepresentation);

      const arrayType = {
        int8: Int8Array,
        int16: Int16Array,
        uint8: Uint8Array,
        uint16: Uint16Array
      };

      pixelData = new arrayType[imageFormat](pixelData.buffer);

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
        windowWidth
      };

    } catch (e) {
      console.error(e);
      throw new Error('Unable to parse dicom');
    }
  }

  private startRender(): void {
    const {width, height} = this.dicomProperties;

    const render = () => {
      // if (this.windowComponent.active) {

        const t = performance.now();
        this.frameDurations.push(t - this.lastTime);
        this.lastTime = t;

        this.renderer.render(this.viewport);

        this.renderDurations.push(performance.now() - t);
      // }
      requestAnimationFrame(render);
    };

    render();
  }

  async ngAfterContentInit(): Promise<any> {
    const canvas = this.canvasElementRef.nativeElement;

    this.dicomProperties = this.parseDicom(await this.getDicomData());

    const {
      height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width, windowLevel, windowWidth
    } = this.dicomProperties;

    const image = new Image({height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width});

    this.image = image;
    this.viewport = new Viewport({image, windowLevel, windowWidth});
    this.renderer = !(<any> window).canvasRenderer ? new CanvasRenderer(canvas) : new WebGLRenderer(canvas);
    (<any> window).canvasRenderer = true;

    this.onResize({
      width: canvas.clientWidth,
      height: canvas.clientHeight
    });

    this.startRender();

    setInterval(() => {

      if (this.frameDurations.length > 0) {
        const meanFrameDuration = this.frameDurations.reduce((sum, d) => sum + d, 0) / this.frameDurations.length;
        this.fps = Math.round(1000 / meanFrameDuration);
        this.frameDurations = [];
      } else {
        this.fps = 0;
      }

      if (this.renderDurations.length > 0) {
        this.meanRenderDuration = this.renderDurations.reduce((sum, d) => sum + d, 0) / this.renderDurations.length;
        this.renderDurations = [];
      } else {
        this.meanRenderDuration = 0;
      }
    }, 500);
  }
}
