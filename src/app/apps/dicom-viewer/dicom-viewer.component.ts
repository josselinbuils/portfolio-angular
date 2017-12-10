import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { parseDicom, sharedCopy } from 'dicom-parser';
import 'rxjs/add/operator/toPromise';

import { MOUSE_BUTTON, PHOTOMETRIC_INTERPRETATION, PIXEL_REPRESENTATION } from '../../constants';
import { WindowInstance } from '../../platform/window/window-instance';
import { WindowComponent } from '../../platform/window/window.component';

const DELTA_LIMIT = 0.02;
const ZOOM_LIMIT = 0.07;
const ZOOM_SENSIBILITY = 3;

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

    size.height -= 30;

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
    if (downEvent.button === MOUSE_BUTTON.LEFT) {
      this.startWindowing(downEvent);
    } else if (downEvent.button === MOUSE_BUTTON.MIDDLE) {
      this.startPan(downEvent);
    } else if (downEvent.button === MOUSE_BUTTON.RIGHT) {
      this.startZoom(downEvent);
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
      const {columns, pixelData, rows} = this.dicomProperties;
      const windowLevel = this.windowLevel - moveEvent.movementY * 2;
      const windowWidth = this.windowWidth + moveEvent.movementX * 2;
      this.image = new ImageData(this.applyWindowing(pixelData, windowLevel, windowWidth), columns, rows);
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private applyWindowing(rawData: number[], windowLevel: number, windowWidth: number): Uint8ClampedArray {
    const t = performance.now();
    const {columns, photometricInterpretation, pixelData, rescaleIntercept, rescaleSlope, rows} = this.dicomProperties;
    const imageData = new Uint8ClampedArray(rows * columns * 4);
    const leftLimit = Math.floor(windowLevel - windowWidth / 2);
    const rightLimit = Math.ceil(windowLevel + windowWidth / 2);

    for (let i = 0; i < pixelData.length; i++) {
      const dataIndex = i * 4;
      const rawValue = pixelData[i];
      let rgbValue = 0;

      if (rawValue > rightLimit) {
        rgbValue = 255;
      } else if (rawValue > leftLimit) {
        rgbValue = Math.floor((rawValue - leftLimit) / windowWidth * 255);
      }

      // rgb
      imageData[dataIndex] = imageData[dataIndex + 1] = imageData[dataIndex + 2] = rgbValue;
      // alpha
      imageData[dataIndex + 3] = 255;
    }

    if (photometricInterpretation === PHOTOMETRIC_INTERPRETATION.MONOCHROME1) {
      for (let i = 0; i < pixelData.length; i++) {
        const dataIndex = i * 4;
        imageData[dataIndex] = imageData[dataIndex + 1] = imageData[dataIndex + 2] = 255 - imageData[dataIndex];
      }
    }

    this.windowLevel = windowLevel;
    this.windowWidth = windowWidth;
    this.renderDurations.push(performance.now() - t);

    return imageData;
  }

  private createShaders(): { fragmentShader: WebGLShader, vertexShader: WebGLShader } {
    const gl = this.gl;

    const vertexShaderSrc = `
      attribute vec2 a_position;

      uniform vec2 u_resolution;
      uniform mat3 u_matrix;

      varying vec2 v_texCoord;

      void main() {
         gl_Position = vec4(u_matrix * vec3(a_position, 1), 1);
         v_texCoord = a_position;
      }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSrc);
    gl.compileShader(vertexShader);

    const fragmentShaderSrc = `
      precision mediump float;

      // our texture
      uniform sampler2D u_image;

      // the texCoords passed in from the vertex shader.
      varying vec2 v_texCoord;

      void main() {
         gl_FragColor = texture2D(u_image, v_texCoord);
      }
    `;

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSrc);
    gl.compileShader(fragmentShader);

    return {fragmentShader, vertexShader};
  }

  private async getDicomData(): Promise<Uint8Array> {
    try {
      return new Uint8Array(await this.http.get('/assets/dicom/CT-MONO2-16-ankle', {responseType: 'arraybuffer'}).toPromise());
    } catch (e) {
      console.error(e);
      throw new Error('Unable to retrieve DICOM file');
    }
  }

  private initRenderer() {
    const gl = this.gl;
    const program = gl.createProgram();

    this.program = program;

    const {fragmentShader, vertexShader} = this.createShaders();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program);

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

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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

      if (bitsAllocated <= 8) {
        pixelData = pixelRepresentation === PIXEL_REPRESENTATION.UNSIGNED
          ? new Uint8Array(pixelData.buffer)
          : new Int8Array(pixelData.buffer);
      } else if (bitsAllocated <= 16) {
        pixelData = pixelRepresentation === PIXEL_REPRESENTATION.UNSIGNED
          ? new Uint16Array(pixelData.buffer)
          : new Int16Array(pixelData.buffer);
      }

      for (let i = 0; i < pixelData.length; i++) {
        pixelData[i] = Math.round(pixelData[i] * rescaleSlope + rescaleIntercept);
      }

      return {
        bitsAllocated,
        columns,
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

  private render(image: any, deltaX: number, deltaY: number, width: number, height: number) {
    const gl = this.gl;

    if (!gl) {
      return;
    }

    const t = performance.now();
    this.frameDurations.push(t - this.lastTime);
    this.lastTime = t;

    // Look up uniform locations
    const u_imageLoc = gl.getUniformLocation(this.program, 'u_image');
    const u_matrixLoc = gl.getUniformLocation(this.program, 'u_matrix');

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

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

  private startRender(): void {
    const {columns, rows} = this.dicomProperties;

    const render = () => {
      if (this.windowComponent.active) {
        const height = Math.round(rows * this.baseZoom * this.userZoom);
        const width = Math.round(columns * this.baseZoom * this.userZoom);
        this.render(this.image, this.deltaX, this.deltaY, width, height);
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

    this.image = new ImageData(this.applyWindowing(pixelData, windowLevel, windowWidth), columns, rows);
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
        this.meanRenderTime = Math.round(this.renderDurations.reduce((sum, d) => sum + d, 0) / this.renderDurations.length);
        this.renderDurations = [];
      } else {
        this.meanRenderTime = 0;
      }

    }, 500);
  }
}
