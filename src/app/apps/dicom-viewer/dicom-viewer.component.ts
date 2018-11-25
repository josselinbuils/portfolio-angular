import { Component, ElementRef, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { MouseButton } from 'app/constants';
import { WindowInstance } from 'app/platform/window/window-instance';
import { WindowComponent } from 'app/platform/window/window.component';

import { Config } from './config/config';
import { MouseTool, RendererType, ViewType } from './constants';
import { DicomComputerService } from './dicom-computer.service';
import { DicomLoaderService } from './dicom-loader.service';
import { math } from './helpers/maths-helpers';
import { computeRotation, computeTrackball, rotateCamera } from './helpers/rotation-helpers';
import { Camera, Dataset, Viewport, Volume } from './models';
import { JsFrameRenderer } from './renderer/js/js-frame-renderer';
import { JsVolumeRenderer } from './renderer/js/js-volume-renderer';
import { Renderer } from './renderer/renderer';
import { WebglRenderer } from './renderer/webgl/webgl-renderer';

const ANNOTATIONS_REFRESH_DELAY = 500;
const DELTA_LIMIT = 0.02;
const PAGING_SENSIBILITY = 1.2;
const ZOOM_LIMIT = 0.07;
const ZOOM_MAX = 5;
const ZOOM_MIN = 0.2;
const ZOOM_SENSIBILITY = 1000;
const WINDOW_LEVEL_SENSIBILITY = 3;
const WINDOW_WIDTH_SENSIBILITY = 5;
const WINDOW_WIDTH_MIN = 1;

@Component({
  selector: 'app-dicom-viewer',
  templateUrl: './dicom-viewer.component.html',
  styleUrls: ['./dicom-viewer.component.scss'],
})
export class DicomViewerComponent implements OnDestroy, WindowInstance {
  static appName = 'DICOM Viewer';
  static iconClass = 'fa-heartbeat';

  @ViewChild('viewportElement') viewportElementRef!: ElementRef<HTMLDivElement>;
  @ViewChild(WindowComponent) windowComponent!: WindowComponent;

  activeLeftTool: MouseTool = MouseTool.Paging;
  activeRightTool: MouseTool = MouseTool.Zoom;
  availableViewTypes?: ViewType[];
  canvas!: HTMLCanvasElement;
  config?: Config;
  errorMessage?: string;
  loading = false;
  showConfig = true;
  title = DicomViewerComponent.appName;
  viewport?: Viewport;

  private destroyers: (() => void)[] = [];
  private frameDurations: number[] = [];
  private lastTime = performance.now();
  private renderDurations: number[] = [];
  private renderer?: Renderer;

  constructor(private readonly viewRenderer: Renderer2,
              private readonly loader: DicomLoaderService,
              private readonly computer: DicomComputerService) {}

  back(): void {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.viewRenderer.removeChild(this.viewportElementRef.nativeElement, this.canvas);
    }

    this.ngOnDestroy();

    delete this.canvas;
    delete this.config;
    delete this.errorMessage;
    delete this.renderer;
    delete this.viewport;

    this.loading = false;
    this.showConfig = true;
  }

  ngOnDestroy(): void {
    this.destroyers.forEach(destroyer => destroyer());
    this.destroyers = [];
  }

  onResize(size: { width: number; height: number }): void {
    const viewRenderer = this.viewRenderer;
    const viewport = this.viewport;

    if (viewRenderer === undefined || viewport === undefined) {
      return;
    }

    size.height -= 42;

    if (size.width !== viewport.width || size.height !== viewport.height) {
      viewRenderer.setAttribute(this.canvas, 'width', size.width.toString());
      viewRenderer.setAttribute(this.canvas, 'height', size.height.toString());

      viewport.width = size.width;
      viewport.height = size.height;
    }
  }

  selectActiveTool(event: { button: MouseButton; tool: MouseTool }): void {
    const { button, tool } = event;

    switch (button) {
      case MouseButton.Left:
        this.activeLeftTool = tool;
        break;
      case MouseButton.Right:
        this.activeRightTool = tool;
    }
  }

  async start(config: Config): Promise<void> {
    this.config = config;
    this.showConfig = false;
    this.loading = true;

    try {
      const dicomFrames = await this.loader.loadFrames(this.config.dataset);

      // Back button has been clicked
      if (this.config === undefined) {
        return;
      }

      const frames = this.computer.computeFrames(dicomFrames);
      const sharedProperties = this.computer.computeSharedProperties(frames);
      const volume = this.computer.computeVolume(frames, sharedProperties);
      const dataset = new Dataset({ frames, ...sharedProperties, volume });
      const frame = frames[Math.floor(dataset.frames.length / 2)];
      const viewType = dataset.is3D ? ViewType.Axial : ViewType.Native;
      const camera = viewType === ViewType.Native
        ? Camera.fromFrame(frame)
        : Camera.fromVolume(volume as Volume, viewType);
      const { windowCenter, windowWidth } = frame;

      this.viewport = new Viewport({ camera, dataset, viewType, windowCenter, windowWidth });
      this.destroyers.push(() => {
        if (this.viewport !== undefined) {
          this.viewport.destroy();
        }
      });
      this.availableViewTypes = this.getAvailableViewTypes();

      console.log(this.viewport);

    } catch (error) {
      this.handleError(error);
    }

    this.canvas = this.viewRenderer.createElement('canvas');
    this.viewRenderer.appendChild(this.viewportElementRef.nativeElement, this.canvas);
    this.viewRenderer.listen(this.canvas, 'mousedown', this.startTool.bind(this));
    this.instantiateRenderer();

    const windowNativeElement = this.windowComponent.windowElementRef.nativeElement;

    this.onResize({
      width: windowNativeElement.clientWidth,
      height: windowNativeElement.clientHeight,
    });

    this.activeLeftTool = this.viewport.dataset.frames.length > 1 ? MouseTool.Paging : MouseTool.Windowing;
    this.destroyers.push(this.disableContextMenu(this.viewportElementRef.nativeElement));

    this.loading = false;
    this.startRender();
  }

  startTool(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const isMacOS = navigator.platform.indexOf('Mac') !== -1;
    let tool: MouseTool;
    let cancelMouseMove: () => void;

    switch (downEvent.button) {
      case MouseButton.Left:
        tool = this.activeLeftTool;
        break;
      case MouseButton.Middle:
        tool = MouseTool.Pan;
        break;
      case MouseButton.Right:
        tool = this.activeRightTool;
        break;
      default:
        throw new Error('Unknown button');
    }

    switch (tool) {
      case MouseTool.Paging:
        cancelMouseMove = this.startPaging(downEvent);
        break;
      case MouseTool.Pan:
        cancelMouseMove = this.startPan(downEvent);
        break;
      case MouseTool.Rotate:
        cancelMouseMove = this.startRotate(downEvent);
        break;
      case MouseTool.Windowing:
        cancelMouseMove = this.startWindowing(downEvent);
        break;
      case MouseTool.Zoom:
        cancelMouseMove = this.startZoom(downEvent);
        break;
      default:
        throw new Error('Unknown tool');
    }

    if ([MouseButton.Left, MouseButton.Middle].includes(downEvent.button) || isMacOS) {
      const cancelMouseUp = this.viewRenderer.listen('window', 'mouseup', () => {
        cancelMouseMove();
        cancelMouseUp();
      });
    }

    if (downEvent.button === MouseButton.Right && !isMacOS) {
      const cancelContextMenu = this.viewRenderer.listen('window', 'contextmenu', () => {
        cancelMouseMove();
        cancelContextMenu();
        return false;
      });
    }
  }

  switchViewType(viewType: ViewType): void {

    if (this.viewport === undefined) {
      throw new Error('Viewport not defined');
    }

    if (viewType !== ViewType.Native && !this.viewport.dataset.is3D) {
      throw new Error(`Unable to switch to view type ${viewType} on a 2D dataset`);
    }

    const { frames, volume } = this.viewport.dataset;
    const frame = frames[Math.floor(frames.length / 2)];

    this.viewport.deltaX = 0;
    this.viewport.deltaY = 0;
    this.viewport.camera = viewType === ViewType.Native
      ? Camera.fromFrame(frame)
      : Camera.fromVolume(volume as Volume, viewType);
    this.viewport.viewType = viewType;
    this.viewport.windowCenter = frame.windowCenter;
    this.viewport.windowWidth = frame.windowWidth;

    if (viewType === ViewType.Native) {
      if (this.activeLeftTool === MouseTool.Rotate) {
        this.activeLeftTool = MouseTool.Paging;
      }
      if (this.activeRightTool === MouseTool.Rotate) {
        this.activeRightTool = MouseTool.Paging;
      }
    }

    this.instantiateRenderer();
    this.updateAnnotations();
  }

  private disableContextMenu(element: HTMLElement): () => void {
    return this.viewRenderer.listen(element, 'mousedown', (event: MouseEvent) => {
      if (event.button === MouseButton.Right) {
        const cancelContextMenu = this.viewRenderer.listen('window', 'contextmenu', () => {
          cancelContextMenu();
          return false;
        });
      }
    });
  }

  private getAvailableViewTypes(): ViewType[] {

    if (this.viewport === undefined || this.config === undefined) {
      return [];
    }

    const availableViewTypes = [ViewType.Native];

    if (this.viewport.dataset.is3D && this.config.rendererType !== RendererType.WebGL) {
      availableViewTypes.push(...[ViewType.Axial, ViewType.Coronal, ViewType.Sagittal]);
    }
    return availableViewTypes;
  }

  private handleError(error: Error): Error {
    this.errorMessage = error.message;

    if (this.loading) {
      this.loading = false;
    }
    throw error;
  }

  private instantiateRenderer(): void {
    const config = this.config as Config;

    try {
      switch (config.rendererType) {
        case RendererType.JavaScript:
          this.renderer = (this.viewport as Viewport).viewType === ViewType.Native
            ? new JsFrameRenderer(this.canvas)
            : new JsVolumeRenderer(this.canvas);
          break;
        case RendererType.WebGL:
          this.renderer = new WebglRenderer(this.canvas);
          this.destroyers.push(() => {
            if (this.renderer !== undefined && this.renderer instanceof WebglRenderer) {
              this.renderer.destroy();
            }
          });
      }
    } catch (error) {
      error.message = `Unable to instantiate ${config.rendererType} renderer: ${error.message}`;
      this.handleError(error);
    }
  }

  private startPaging(downEvent: MouseEvent): () => void {
    const startY = downEvent.clientY;
    const viewport = this.viewport as Viewport;
    const { camera } = viewport;

    const direction = camera.getDirection();
    const startLookPoint = camera.lookPoint;
    let currentLookPoint = camera.lookPoint;

    const { max, min } = viewport.dataset.getLimitsAlongAxe(direction);

    const correctLookPoint = (point: number[]) => {
      const correctionVectorNorm = math.chain(point).subtract(camera.lookPoint).dot(direction).done();
      const correctionVector = math.multiply(direction, correctionVectorNorm);
      return math.add(camera.lookPoint, correctionVector) as number[];
    };

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const sensitivity = (max.positionOnAxe - min.positionOnAxe) / viewport.height * PAGING_SENSIBILITY;
      const deltaPosition = (startY - moveEvent.clientY) * sensitivity;
      let newLookPoint = math.add(startLookPoint, math.multiply(direction, deltaPosition)) as number[];
      const positionOnDirection = math.dot(newLookPoint, direction);

      if (positionOnDirection < min.positionOnAxe) {
        newLookPoint = correctLookPoint(min.point);
      } else if (positionOnDirection > max.positionOnAxe) {
        newLookPoint = correctLookPoint(max.point);
      }

      if (math.distance(newLookPoint, currentLookPoint) > Number.EPSILON) {
        camera.lookPoint = newLookPoint;
        camera.eyePoint = math.subtract(camera.lookPoint, direction) as number[];
        currentLookPoint = newLookPoint;
      }
    });
  }

  private startPan(downEvent: MouseEvent): () => void {
    const canvas = this.canvas;
    const viewport = this.viewport as Viewport;
    const startX = downEvent.clientX - viewport.deltaX * canvas.clientWidth;
    const startY = downEvent.clientY - viewport.deltaY * canvas.clientHeight;

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      viewport.deltaX = (moveEvent.clientX - startX) / canvas.clientWidth;
      viewport.deltaY = (moveEvent.clientY - startY) / canvas.clientHeight;

      // noinspection JSSuspiciousNameCombination
      if (Math.abs(viewport.deltaX) < DELTA_LIMIT && Math.abs(viewport.deltaY) < DELTA_LIMIT) {
        viewport.deltaX = 0;
        viewport.deltaY = 0;
      }
    });
  }

  private startRender(): void {
    const render = () => {

      if (this.renderer === undefined || this.viewport === undefined) {
        return;
      }

      if (this.windowComponent.active && this.viewport.isDirty()) {
        const t = performance.now();

        try {
          const { camera, deltaX, deltaY, windowCenter, windowWidth } = this.viewport;
          this.renderer.render(this.viewport.dataset, { deltaX, deltaY, camera, windowCenter, windowWidth });
          this.viewport.makeClean();
          this.renderDurations.push(performance.now() - t);
          this.frameDurations.push(t - this.lastTime);
          this.lastTime = t;
        } catch (error) {
          error.message = `Unable to render viewport: ${error.message}`;
          this.handleError(error);
        }
      }

      window.requestAnimationFrame(render);
    };

    this.frameDurations = [];
    this.renderDurations = [];

    this.updateAnnotations();
    const statsInterval = window.setInterval(() => this.updateAnnotations(), ANNOTATIONS_REFRESH_DELAY);
    this.destroyers.push(() => clearInterval(statsInterval));

    render();
  }

  private startRotate(downEvent: MouseEvent): () => void {
    const viewport = this.viewport as Viewport;

    if (!viewport.dataset.is3D) {
      throw new Error('Unable to rotate on a 2D dataset');
    }

    const { height, width } = viewport;
    const { top, left } = this.viewportElementRef.nativeElement.getBoundingClientRect();
    const trackballCenter = [width / 2, height / 2];
    const trackballRadius = Math.min(width, height) / 2;
    const cursorStartPosition = [downEvent.clientX - left, downEvent.clientY - top];
    let previousVector = computeTrackball(trackballCenter, trackballRadius, cursorStartPosition);

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const cursorPosition = [moveEvent.clientX - left, moveEvent.clientY - top];
      const currentVector = computeTrackball(trackballCenter, trackballRadius, cursorPosition);
      const { angle, axis } = computeRotation(previousVector, currentVector);

      if (Math.abs(angle) > 0) {
        const camera = viewport.camera;
        rotateCamera(camera, axis, angle);
        camera.baseFieldOfView = (viewport.dataset.volume as Volume).getOrientedDimensionMm(camera.upVector);
        previousVector = currentVector;

        if (viewport.viewType !== ViewType.Oblique) {
          viewport.viewType = ViewType.Oblique;
          this.updateAnnotations();
        }
      }
    });
  }

  private startWindowing(downEvent: MouseEvent): () => void {
    const viewport = this.viewport as Viewport;
    const startX = downEvent.clientX;
    const startY = downEvent.clientY;

    const startWindowWidth = viewport.windowWidth;
    const startWindowCenter = viewport.windowCenter;

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const deltaWindowWidth = (moveEvent.clientX - startX) * WINDOW_WIDTH_SENSIBILITY;
      const windowWidth = Math.max(startWindowWidth + deltaWindowWidth, WINDOW_WIDTH_MIN);
      const windowCenter = startWindowCenter - (moveEvent.clientY - startY) * WINDOW_LEVEL_SENSIBILITY;
      viewport.windowWidth = windowWidth;
      viewport.windowCenter = windowCenter;
      this.updateAnnotations({ windowCenter, windowWidth });
    });
  }

  private startZoom(downEvent: MouseEvent): () => void {
    const viewport = this.viewport as Viewport;
    const { camera, deltaX, deltaY, height } = viewport;
    const { baseFieldOfView } = camera;
    const startY = downEvent.clientY;
    const startFOV = camera.fieldOfView;

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const maxFOV = baseFieldOfView / ZOOM_MIN;
      const minFOV = baseFieldOfView / ZOOM_MAX;
      const newFieldOfView = startFOV + (moveEvent.clientY - startY) * ZOOM_SENSIBILITY / height;

      camera.fieldOfView = Math.max(Math.min(newFieldOfView, maxFOV), minFOV);

      const zoom = viewport.getImageZoom();

      // Helps to set zoom at 1
      if (Math.abs(zoom - 1) < ZOOM_LIMIT) {
        camera.fieldOfView *= zoom;
      }

      // Helps to fit the viewport of image is centered
      if (deltaX === 0 && deltaY === 0) {
        if (Math.abs(baseFieldOfView / camera.fieldOfView - 1) < ZOOM_LIMIT) {
          camera.fieldOfView = baseFieldOfView;
        }
      }

      this.updateAnnotations({ zoom: viewport.getImageZoom() });
    });
  }

  private updateAnnotations(updatedProperties?: any): void {

    if (this.viewport === undefined) {
      return;
    }

    try {
      if (updatedProperties !== undefined) {
        this.viewport.annotations = { ...this.viewport.annotations, ...updatedProperties };
        return;
      }

      const config = this.config as Config;
      const datasetName = config.dataset.name;
      const rendererType = config.rendererType;
      const viewType = this.viewport.viewType;
      const windowCenter = this.viewport.windowCenter;
      const windowWidth = this.viewport.windowWidth;
      const zoom = this.viewport.getImageZoom();

      let fps: number;
      let meanRenderDuration: number;

      if (this.frameDurations.length > 0) {
        const meanFrameDuration = this.frameDurations.reduce((sum, d) => sum + d, 0) / this.frameDurations.length;
        fps = Math.round(1000 / meanFrameDuration);
        this.frameDurations = [];
      } else {
        fps = 0;
      }

      if (this.renderDurations.length > 0) {
        meanRenderDuration = this.renderDurations.reduce((sum, d) => sum + d, 0) / this.renderDurations.length;
        this.renderDurations = [];
      } else {
        meanRenderDuration = 0;
      }

      this.viewport.annotations = {
        datasetName, fps, meanRenderDuration, rendererType, viewType, windowCenter, windowWidth, zoom,
      };
    } catch (error) {
      error.message = `Unable to compute annotations: ${error.message}`;
      this.handleError(error);
    }
  }
}
