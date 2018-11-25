import { Component, ElementRef, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { MouseButton } from 'app/constants';
import { WindowInstance } from 'app/platform/window/window-instance';
import { WindowComponent } from 'app/platform/window/window.component';

import { Config } from './config/config';
import { MouseTool, RendererType, ViewType } from './constants';
import { DicomComputerService } from './dicom-computer.service';
import { DicomLoaderService } from './dicom-loader.service';
import { Camera, Dataset, Viewport, Volume } from './models';
import { JsFrameRenderer } from './renderer/js/js-frame-renderer';
import { JsVolumeRenderer } from './renderer/js/js-volume-renderer';
import { Renderer } from './renderer/renderer';
import { WebglRenderer } from './renderer/webgl/webgl-renderer';
import { Toolbox } from './toolbox/toolbox';

const ANNOTATIONS_REFRESH_DELAY = 500;

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

  availableViewTypes?: ViewType[];
  canvas?: HTMLCanvasElement;
  config?: Config;
  errorMessage?: string;
  loading = false;
  MouseButton = MouseButton;
  showConfig = true;
  title = DicomViewerComponent.appName;
  toolbox?: Toolbox;
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
    delete this.toolbox;
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

  async start(config: Config): Promise<void> {
    try {
      this.config = config;
      this.showConfig = false;
      this.loading = true;

      const dicomFrames = await this.loader.loadFrames(this.config.dataset);

      // Back button has been clicked
      if (this.config === undefined) {
        return;
      }

      const annotations = {
        datasetName: config.dataset.name,
        rendererType: config.rendererType,
      };
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

      this.viewport = new Viewport({ annotations, camera, dataset, viewType, windowCenter, windowWidth });

      console.log(this.viewport);

      this.destroyers.push(() => {
        if (this.viewport !== undefined) {
          this.viewport.destroy();
        }
      });

      this.availableViewTypes = this.getAvailableViewTypes();

      this.toolbox = new Toolbox(this.viewport, this.viewportElementRef.nativeElement, this.viewRenderer);
      this.toolbox.selectActiveTool({
        button: MouseButton.Left,
        tool: this.viewport.dataset.frames.length > 1 ? MouseTool.Paging : MouseTool.Windowing,
      });

      this.canvas = this.viewRenderer.createElement('canvas');
      this.viewRenderer.appendChild(this.viewportElementRef.nativeElement, this.canvas);
      this.viewRenderer.listen(this.canvas, 'mousedown', (downEvent: MouseEvent) => {
        if (this.toolbox !== undefined) {
          this.toolbox.startTool(downEvent);
        }
      });
      this.instantiateRenderer();

      const windowNativeElement = this.windowComponent.windowElementRef.nativeElement;

      this.onResize({
        width: windowNativeElement.clientWidth,
        height: windowNativeElement.clientHeight,
      });

      this.destroyers.push(this.disableContextMenu(this.viewportElementRef.nativeElement));

      this.loading = false;
      this.startRender();

    } catch (error) {
      throw this.handleError(error);
    }
  }

  switchViewType(viewType: ViewType): void {

    if (this.viewport === undefined) {
      throw new Error('Viewport undefined');
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
    this.viewport.updateAnnotations();

    if (viewType === ViewType.Native) {
      const toolbox = this.toolbox as Toolbox;

      if (toolbox.getActiveTool(MouseButton.Left) === MouseTool.Rotate) {
        toolbox.selectActiveTool({
          button: MouseButton.Left,
          tool: MouseTool.Paging,
        });
      }
      if (toolbox.getActiveTool(MouseButton.Right) === MouseTool.Rotate) {
        toolbox.selectActiveTool({
          button: MouseButton.Right,
          tool: MouseTool.Paging,
        });
      }
    }

    this.instantiateRenderer();
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
    return error;
  }

  private instantiateRenderer(): void {
    const config = this.config as Config;

    try {
      if (this.canvas === undefined) {
        throw new Error('Canvas undefined;');
      }

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
      throw this.handleError(error);
    }
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
          throw this.handleError(error);
        }
      }

      window.requestAnimationFrame(render);
    };

    this.frameDurations = [];
    this.renderDurations = [];

    const statsInterval = window.setInterval(() => {

      if (this.viewport === undefined) {
        return;
      }

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

      this.viewport.updateAnnotations({ fps, meanRenderDuration });

    }, ANNOTATIONS_REFRESH_DELAY);

    this.destroyers.push(() => clearInterval(statsInterval));

    render();
  }
}
