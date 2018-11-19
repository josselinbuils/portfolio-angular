import { Component, ElementRef, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { MouseButton } from 'app/constants';
import { WindowInstance } from 'app/platform/window/window-instance';
import { WindowComponent } from 'app/platform/window/window.component';

import { Config } from './config/config';
import { MouseTool, RendererType } from './constants';
import { DicomComputerService } from './dicom-computer.service';
import { DicomLoaderService } from './dicom-loader.service';
import { Camera, DicomDataset, Viewport } from './models';
import { JsRenderer } from './renderer/js/js-renderer';
import { Renderer } from './renderer/renderer';
import { WasmRenderer } from './renderer/wasm/wasm-renderer';
import { WebGLRenderer } from './renderer/webgl/webgl-renderer';

const ANNOTATIONS_REFRESH_DELAY = 500;
const DELTA_LIMIT = 0.02;
const ZOOM_LIMIT = 0.07;
const ZOOM_MAX = 5;
const ZOOM_MIN = 0.2;
const ZOOM_SENSIBILITY = 3;
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

  @ViewChild('viewportElement') viewportElementRef: ElementRef<HTMLDivElement>;
  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  activeLeftTool: MouseTool;
  activeRightTool: MouseTool = MouseTool.Zoom;
  canvas: HTMLCanvasElement;
  config?: Config;
  dataset?: DicomDataset;
  errorMessage?: string;
  fps = 0;
  loading = false;
  meanRenderDuration: number;
  showConfig = true;
  title = DicomViewerComponent.appName;
  viewport: Viewport;

  private cancelMouseDownListener: () => void;
  private frameDurations: number[];
  private lastTime = performance.now();
  private renderDurations: number[];
  private renderer: Renderer;
  private statsInterval: number;

  constructor(private readonly viewRenderer: Renderer2,
              private readonly loader: DicomLoaderService,
              private readonly computer: DicomComputerService) {}

  back(): void {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.viewRenderer.removeChild(this.viewportElementRef.nativeElement, this.canvas);
    }

    this.ngOnDestroy();

    delete this.cancelMouseDownListener;
    delete this.canvas;
    delete this.config;
    delete this.dataset;
    delete this.errorMessage;
    delete this.renderer;
    delete this.statsInterval;
    delete this.viewport;

    this.loading = false;
    this.showConfig = true;
  }

  ngOnDestroy(): void {
    if (typeof this.cancelMouseDownListener === 'function') {
      this.cancelMouseDownListener();
    }
    if (this.dataset !== undefined) {
      this.dataset.destroy();
    }
    if (this.renderer !== undefined) {
      if (typeof this.renderer.destroy === 'function') {
        this.renderer.destroy();
      }
    }
    if (this.statsInterval !== undefined) {
      clearInterval(this.statsInterval);
    }
  }

  onResize(size: { width: number; height: number }): void {
    const viewRenderer = this.viewRenderer;
    const viewport = this.viewport;

    size.height -= 42;

    if (viewRenderer !== undefined && viewport !== undefined) {
      viewRenderer.setAttribute(this.canvas, 'width', size.width.toString());
      viewRenderer.setAttribute(this.canvas, 'height', size.height.toString());

      viewport.width = size.width;
      viewport.height = size.height;

      if (this.renderer !== undefined && typeof this.renderer.resize === 'function') {
        this.renderer.resize(viewport);
      }
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
      this.dataset = new DicomDataset({ frames });
      console.log(this.dataset.frames);

    } catch (error) {
      this.handleError(error);
    }

    this.canvas = this.viewRenderer.createElement('canvas');
    this.viewRenderer.appendChild(this.viewportElementRef.nativeElement, this.canvas);
    this.viewRenderer.listen(this.canvas, 'mousedown', this.startTool.bind(this));

    try {
      switch (this.config.rendererType) {
        case RendererType.JavaScript:
          this.renderer = new JsRenderer(this.canvas);
          break;
        case RendererType.WebAssembly:
          this.renderer = new WasmRenderer(this.canvas);
          break;
        case RendererType.WebGL:
          this.renderer = new WebGLRenderer(this.canvas);
      }

      if (typeof this.renderer.init === 'function') {
        await this.renderer.init();
      }

    } catch (error) {
      this.handleError(new Error(`Unable to instantiate ${this.config.rendererType} renderer: ${error.message}`));
    }

    const image = this.dataset.frames[0];
    const { windowCenter, windowWidth } = image;
    const camera = Camera.fromFrame(image);
    this.viewport = new Viewport({ camera, image, windowCenter, windowWidth });
    console.log(this.viewport);

    const windowNativeElement = this.windowComponent.windowElementRef.nativeElement;

    this.onResize({
      width: windowNativeElement.clientWidth,
      height: windowNativeElement.clientHeight,
    });

    this.viewport.zoom = Math.min(this.viewport.height / image.rows, 1);

    this.activeLeftTool = this.dataset.frames.length > 1 ? MouseTool.Paging : MouseTool.Windowing;
    this.cancelMouseDownListener = this.disableContextMenu(this.viewportElementRef.nativeElement);

    this.loading = false;
    this.startRender();
  }

  startPaging(downEvent: MouseEvent): () => void {
    const startY = downEvent.clientY;
    const frames = this.dataset.frames;
    const startIndex = frames.indexOf(this.viewport.image);

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const deltaInstance = Math.floor((moveEvent.clientY - startY) * frames.length / this.viewport.height * 1.2);
      const newIndex = Math.min(Math.max(startIndex + deltaInstance, 0), frames.length - 1);
      this.viewport.image = frames[newIndex];
    });
  }

  startPan(downEvent: MouseEvent): () => void {
    const canvas = this.canvas;
    const viewport = this.viewport;
    const startX = downEvent.clientX - viewport.deltaX * canvas.clientWidth;
    const startY = downEvent.clientY - viewport.deltaY * canvas.clientHeight;

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      viewport.deltaX = (moveEvent.clientX - startX) / canvas.clientWidth;
      viewport.deltaY = (moveEvent.clientY - startY) / canvas.clientHeight;

      // noinspection JSSuspiciousNameCombination
      if (Math.abs(viewport.deltaX) < DELTA_LIMIT && Math.abs(viewport.deltaY) < DELTA_LIMIT) {
        viewport.deltaX = viewport.deltaY = 0;
      }
    });
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
    }

    switch (tool) {
      case MouseTool.Paging:
        cancelMouseMove = this.startPaging(downEvent);
        break;
      case MouseTool.Pan:
        cancelMouseMove = this.startPan(downEvent);
        break;
      case MouseTool.Windowing:
        cancelMouseMove = this.startWindowing(downEvent);
        break;
      case MouseTool.Zoom:
        cancelMouseMove = this.startZoom(downEvent);
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

  startZoom(downEvent: MouseEvent): () => void {
    const viewport = this.viewport;
    const startY = downEvent.clientY;
    const startZoom = viewport.zoom;

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      viewport.zoom = startZoom - (moveEvent.clientY - startY) * ZOOM_SENSIBILITY / this.canvas.clientHeight;
      viewport.zoom = Math.min(Math.max(viewport.zoom, ZOOM_MIN), ZOOM_MAX);

      // Helps to set zoom at 1
      if (Math.abs(viewport.zoom - 1) < ZOOM_LIMIT) {
        viewport.zoom = 1;
      }

      // Helps to fit the viewport of image is centered
      if (viewport.deltaX === 0 && viewport.deltaY === 0) {
        const fitViewportZoom = viewport.height / viewport.image.rows;

        if (Math.abs(viewport.zoom - fitViewportZoom) < ZOOM_LIMIT) {
          viewport.zoom = fitViewportZoom;
        }
      }
    });
  }

  startWindowing(downEvent: MouseEvent): () => void {
    const startX = downEvent.clientX;
    const startY = downEvent.clientY;

    const startWindowWidth = this.viewport.windowWidth;
    const startWindowLevel = this.viewport.windowCenter;

    return this.viewRenderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.viewport.windowWidth = startWindowWidth + (moveEvent.clientX - startX) * WINDOW_WIDTH_SENSIBILITY;
      this.viewport.windowCenter = startWindowLevel - (moveEvent.clientY - startY) * WINDOW_LEVEL_SENSIBILITY;
      this.viewport.windowWidth = Math.max(this.viewport.windowWidth, WINDOW_WIDTH_MIN);
    });
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

  private handleError(error: Error): Error {
    this.errorMessage = error.message;

    if (this.loading) {
      this.loading = false;
    }
    throw error;
  }

  private startRender(): void {
    const render = () => {

      if (this.renderer === undefined) {
        return;
      }

      if (this.windowComponent.active && this.viewport.isDirty()) {
        const t = performance.now();

        try {
          this.renderer.render(this.viewport);
          this.viewport.makeClean();
          this.renderDurations.push(performance.now() - t);
          this.frameDurations.push(t - this.lastTime);
          this.lastTime = t;
        } catch (error) {
          this.handleError(new Error(`Unable to render viewport: ${error.message}`));
        }
      }

      window.requestAnimationFrame(render);
    };

    this.frameDurations = [];
    this.renderDurations = [];

    this.statsInterval = window.setInterval(() => {
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
    }, ANNOTATIONS_REFRESH_DELAY);

    render();
  }
}
