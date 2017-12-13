import { Int16FragmentShader } from './shaders/fragment/int16';
import { Renderer } from '../renderer';
import { VertexShader } from './shaders/vertex';
import { Viewport } from '../../models/viewport';
import { Image } from '../../models/image';

export class WebGLRenderer implements Renderer {

  private dicomProperties: any = {};
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      throw new Error('Cannot retrieve WebGL context');
    }

    this.gl = gl;
  }

  render(viewport: Viewport) {
    const gl = this.gl;
    const t = performance.now();

    const {height, imageFormat, rescaleIntercept, rescaleSlope, width} = viewport.image;

    if (!this.program) {
      this.program = this.createProgram(imageFormat);
    }

    gl.deleteTexture(this.texture);
    this.texture = this.createTexture(viewport.image);

    // Look up where the vertex data needs to go.
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');

    // Provide texture coordinates for the rectangle.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Look up uniform locations
    const rescaleInterceptLocation = gl.getUniformLocation(this.program, 'rescaleIntercept');
    const rescaleSlopeLocation = gl.getUniformLocation(this.program, 'rescaleSlope');
    const windowLevelLocation = gl.getUniformLocation(this.program, 'windowLevel');
    const windowWidthLocation = gl.getUniformLocation(this.program, 'windowWidth');

    gl.uniform1f(rescaleInterceptLocation, rescaleIntercept);
    gl.uniform1f(rescaleSlopeLocation, rescaleSlope);
    gl.uniform1f(windowWidthLocation, viewport.windowWidth);
    gl.uniform1f(windowLevelLocation, viewport.windowLevel);

    const u_imageLoc = gl.getUniformLocation(this.program, 'u_image');
    const u_matrixLoc = gl.getUniformLocation(this.program, 'u_matrix');

    // Convert dst pixel coordinates to clip space coordinates
    const baseZoom = viewport.height / height;
    const displayWidth = Math.round(width * baseZoom * viewport.zoom);
    const displayHeight = Math.round(height * baseZoom * viewport.zoom);
    const clipX = (0.5 - displayWidth / viewport.width / 2 + viewport.deltaX) * 2 - 1;
    const clipY = (0.5 - displayHeight / viewport.height / 2 + viewport.deltaY) * -2 + 1;
    const clipWidth = displayWidth / viewport.width * 2;
    const clipHeight = displayHeight / viewport.height * -2;

    // Build a matrix that will stretch our unit quad to our desired size and location
    gl.uniformMatrix3fv(u_matrixLoc, false, [clipWidth, 0, 0, 0, clipHeight, 0, clipX, clipY, 1]);

    // Draw the rectangle.
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  resize(viewport: Viewport): void {
    const gl = this.gl;

    if (gl) {
      gl.viewport(0, 0, viewport.width, viewport.height);
    }
  }

  private createProgram(imageFormat: string): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();

    this.program = program;

    const {fragmentShader, vertexShader} = this.createShaders(imageFormat);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
  }

  private createShaders(imageFormat: string): { fragmentShader: WebGLShader, vertexShader: WebGLShader } {
    const gl = this.gl;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, VertexShader.src);
    gl.compileShader(vertexShader);

    const fragmentShaderClass = this.getFragmentShaderClass(imageFormat);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderClass.src);
    gl.compileShader(fragmentShader);

    return {fragmentShader, vertexShader};
  }

  private createTexture(image: Image): WebGLTexture {
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
      int8: gl.LUMINANCE,
      uint16: gl.LUMINANCE_ALPHA,
      int16: gl.LUMINANCE_ALPHA,
      rgb: gl.RGB
    };

    const {height, imageFormat, pixelData, width} = image;
    const format = textureFormat[imageFormat];
    const fragmentShaderClass = this.getFragmentShaderClass(imageFormat);
    const imageData = fragmentShaderClass.formatImageData(pixelData, width, height);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, imageData);

    return texture;
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
}
