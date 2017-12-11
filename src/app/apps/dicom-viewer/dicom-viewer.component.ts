import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { parseDicom, sharedCopy } from 'dicom-parser';
import 'rxjs/add/operator/toPromise';

import { Int16FragmentShader } from './shaders/fragment/int16';
import { MOUSE_BUTTON, PHOTOMETRIC_INTERPRETATION, PIXEL_REPRESENTATION } from '../../constants';
import { WindowInstance } from '../../platform/window/window-instance';
import { WindowComponent } from '../../platform/window/window.component';
import { VertexShader } from './shaders/vertex';

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

  baseZoom: number;
  canvas: HTMLElement;
  dicomProperties: any = {};
  displayZoom: string;
  fps = 0;
  meanRenderTime = 0;
  title = DicomViewerComponent.appName;
  windowLevel: number;
  windowWidth: number;
  userZoom = 1;

  private deltaX = 0;
  private deltaY = 0;
  private frameDurations: number[] = [];
  private gl: WebGLRenderingContext;
  private height: number;
  private image: any;
  private lastTime: number = performance.now();
  private program;
  private renderDurations: number[] = [];
  private width: number;

  constructor(private http: HttpClient, private renderer: Renderer2) {
  }

  onResize(size: { width: number, height: number }) {
    const gl = this.gl;

    size.height -= 42;

    this.renderer.setAttribute(this.canvasElementRef.nativeElement, 'width', size.width.toString());
    this.renderer.setAttribute(this.canvasElementRef.nativeElement, 'height', size.height.toString());
    this.baseZoom = size.height / this.dicomProperties.rows;

    if (gl) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
  }

  startPan(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const canvas = this.canvasElementRef.nativeElement;
    const startX: number = downEvent.clientX - this.deltaX * canvas.clientWidth;
    const startY: number = downEvent.clientY - this.deltaY * canvas.clientHeight;

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {

      this.deltaX = (moveEvent.clientX - startX) / canvas.clientWidth;
      this.deltaY = (moveEvent.clientY - startY) / canvas.clientHeight;

      // noinspection JSSuspiciousNameCombination
      if (Math.abs(this.deltaX) < DELTA_LIMIT && Math.abs(this.deltaY) < DELTA_LIMIT) {
        this.deltaX = this.deltaY = 0;
      }
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
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

    const startY = downEvent.clientY;
    const startZoom = this.userZoom;

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {

      this.userZoom = Math.max(startZoom - (moveEvent.clientY - startY) * ZOOM_SENSIBILITY / canvas.clientHeight, 0.5);

      if (Math.abs(this.userZoom - 1) < ZOOM_LIMIT) {
        this.userZoom = 1;
      }
    });

    const cancelContextMenu: () => void = this.renderer.listen('window', 'contextmenu', () => {
      cancelMouseMove();
      cancelContextMenu();
      return false;
    });
  }

  startWindowing(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.windowLevel = this.windowLevel - moveEvent.movementY * WINDOWING_SENSIBILITY;
      this.windowWidth = this.windowWidth + moveEvent.movementX * WINDOWING_SENSIBILITY;
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();

    this.program = program;

    const {fragmentShader, vertexShader} = this.createShaders();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
  }

  private createShaders(): { fragmentShader: WebGLShader, vertexShader: WebGLShader } {
    const gl = this.gl;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, VertexShader.src);
    gl.compileShader(vertexShader);

    const {imageFormat} = this.dicomProperties;
    const fragmentShaderClass = this.getFragmentShaderClass(imageFormat);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderClass.src);
    gl.compileShader(fragmentShader);

    return {fragmentShader, vertexShader};
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const textureFormat = {
      uint8: gl.LUMINANCE,
      int8: gl.LUMINANCE_ALPHA,
      uint16: gl.LUMINANCE_ALPHA,
      int16: gl.RGB,
      rgb: gl.RGB
    };

    const {columns, imageFormat, pixelData, rows} = this.dicomProperties;
    const format = textureFormat[imageFormat];
    const fragmentShaderClass = this.getFragmentShaderClass(imageFormat);
    const imageData = this.getFragmentShaderClass(imageFormat).formatImageData(pixelData, columns, rows);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, format, columns, rows, 0, format, gl.UNSIGNED_BYTE, imageData);

    return texture;
  }

  private async getDicomData(): Promise<Uint8Array> {
    try {
      return new Uint8Array(await this.http.get('/assets/dicom/CT-MONO2-16-ankle', {responseType: 'arraybuffer'}).toPromise());
    } catch (e) {
      console.error(e);
      throw new Error('Unable to retrieve DICOM file');
    }
  }

  private getFragmentShaderClass(imageFormat: string): any {

    const fragmentShaderClass = {
      int16: Int16FragmentShader
    };

    if (!fragmentShaderClass[imageFormat]) {
      throw new Error(`No fragment shader available for image format ${imageFormat}`);
    }

    return fragmentShaderClass[imageFormat];
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

  private initRenderer() {
    const gl = this.gl;
    const program = this.createProgram();

    // Look up where the vertex data needs to go.
    const positionLocation = gl.getAttribLocation(program, 'a_position');

    // Provide texture coordinates for the rectangle.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  private parseDicom(rawDicomData: Uint8Array): any {
    try {
      const dataset = parseDicom(rawDicomData);
      const bitsAllocated = dataset.uint16('x00280100');
      const columns = dataset.uint16('x00280011');
      const patientName = dataset.string('x00100010');
      const photometricInterpretation = dataset.string('x00280004');
      const pixelRepresentation = dataset.uint16('x00280103');
      const rows = dataset.uint16('x00280010');
      const rescaleIntercept = dataset.intString('x00281052');
      const rescaleSlope = dataset.floatString('x00281053');
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
        columns,
        imageFormat,
        patientName,
        photometricInterpretation,
        pixelData,
        pixelRepresentation,
        rescaleIntercept,
        rescaleSlope,
        rows,
        windowLevel,
        windowWidth
      };

    } catch (e) {
      console.error(e);
      throw new Error('Unable to parse dicom');
    }
  }

  private render(texture: WebGLTexture, deltaX: number, deltaY: number, width: number, height: number,
                 windowWidth: number, windowLevel: number) {

    const gl = this.gl;
    const t = performance.now();

    this.frameDurations.push(t - this.lastTime);
    this.lastTime = t;

    const {rescaleIntercept, rescaleSlope} = this.dicomProperties;

    // Look up uniform locations
    const rescaleInterceptLocation = gl.getUniformLocation(this.program, 'rescaleIntercept');
    const rescaleSlopeLocation = gl.getUniformLocation(this.program, 'rescaleSlope');
    const windowLevelLocation = gl.getUniformLocation(this.program, 'windowLevel');
    const windowWidthLocation = gl.getUniformLocation(this.program, 'windowWidth');

    gl.uniform1f(rescaleInterceptLocation, rescaleIntercept);
    gl.uniform1f(rescaleSlopeLocation, rescaleSlope);
    gl.uniform1f(windowWidthLocation, windowWidth);
    gl.uniform1f(windowLevelLocation, windowLevel);

    const u_imageLoc = gl.getUniformLocation(this.program, 'u_image');
    const u_matrixLoc = gl.getUniformLocation(this.program, 'u_matrix');

    // Convert dst pixel coordinates to clip space coordinates
    const clipX = (0.5 - width / gl.canvas.width / 2 + deltaX) * 2 - 1;
    const clipY = (0.5 - height / gl.canvas.height / 2 + deltaY) * -2 + 1;
    const clipWidth = width / gl.canvas.width * 2;
    const clipHeight = height / gl.canvas.height * -2;

    // Build a matrix that will stretch our unit quad to our desired size and location
    gl.uniformMatrix3fv(u_matrixLoc, false, [clipWidth, 0, 0, 0, clipHeight, 0, clipX, clipY, 1]);

    // Draw the rectangle.
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private startRender(texture: WebGLTexture): void {
    const {columns, rows} = this.dicomProperties;

    const render = () => {
      if (this.windowComponent.active) {
        const height = Math.round(rows * this.baseZoom * this.userZoom);
        const width = Math.round(columns * this.baseZoom * this.userZoom);
        this.render(texture, this.deltaX, this.deltaY, width, height, this.windowWidth, this.windowLevel);
      }
      requestAnimationFrame(render);
    };

    this.initRenderer();
    render();
  }

  async ngAfterContentInit(): Promise<any> {
    this.dicomProperties = this.parseDicom(await this.getDicomData());
    this.gl = this.canvasElementRef.nativeElement.getContext('webgl');

    const {columns, pixelData, rows, windowLevel, windowWidth} = this.dicomProperties;

    this.baseZoom = this.gl.canvas.height / rows;

    this.windowLevel = windowLevel;
    this.windowWidth = windowWidth;

    const texture = this.createTexture();
    this.startRender(texture);

    setInterval(() => {
      if (this.frameDurations.length > 0) {
        const meanFrameDuration = this.frameDurations.reduce((sum, d) => sum + d, 0) / this.frameDurations.length;
        this.fps = Math.round(1000 / meanFrameDuration);
        this.frameDurations = [];
      } else {
        this.fps = 0;
      }
    }, 500);
  }
}
