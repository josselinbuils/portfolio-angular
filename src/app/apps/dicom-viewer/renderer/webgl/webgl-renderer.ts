import { Image } from '../../models/image';
import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';

import { getFragmentShaderSrc, getTextureFormat } from './fragment-shader';
import { VERTEX_SHADER_SRC } from './vertex-shader';

export class WebGLRenderer implements Renderer {

  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;

  constructor(canvas: HTMLCanvasElement) {
    if (canvas.getContext('webgl') instanceof WebGLRenderingContext) {
      this.gl = canvas.getContext('webgl');
    } else if (canvas.getContext('experimental-webgl') instanceof WebGLRenderingContext) {
      this.gl = canvas.getContext('experimental-webgl');
    } else {
      throw new Error('Cannot retrieve WebGL context');
    }
  }

  destroy(): void {
    const gl: WebGLRenderingContext = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }

  render(viewport: Viewport): void {
    const gl: WebGLRenderingContext = this.gl;
    const {height, imageFormat, rescaleIntercept, rescaleSlope, width} = viewport.image;

    if (this.program === undefined) {
      this.program = this.createProgram(imageFormat);
    }

    gl.deleteTexture(this.texture);
    this.texture = this.createTexture(viewport.image);

    // Look up where the vertex data needs to go.
    const positionLocation: GLint = gl.getAttribLocation(this.program, 'a_position');

    // Provide texture coordinates for the rectangle.
    const positionBuffer: WebGLBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    if (imageFormat !== 'rgb') {
      // Look up uniform locations
      const rescaleInterceptLocation: WebGLUniformLocation = gl.getUniformLocation(this.program, 'rescaleIntercept');
      const rescaleSlopeLocation: WebGLUniformLocation = gl.getUniformLocation(this.program, 'rescaleSlope');
      const windowLevelLocation: WebGLUniformLocation = gl.getUniformLocation(this.program, 'windowLevel');
      const windowWidthLocation: WebGLUniformLocation = gl.getUniformLocation(this.program, 'windowWidth');

      gl.uniform1f(rescaleInterceptLocation, rescaleIntercept);
      gl.uniform1f(rescaleSlopeLocation, rescaleSlope);
      gl.uniform1f(windowWidthLocation, viewport.windowWidth);
      gl.uniform1f(windowLevelLocation, viewport.windowLevel);
    }

    const matrixLocation: WebGLUniformLocation = gl.getUniformLocation(this.program, 'u_matrix');

    // Convert dst pixel coordinates to clip space coordinates
    const displayWidth: number = Math.round(width * viewport.zoom);
    const displayHeight: number = Math.round(height * viewport.zoom);
    const clipX: number = (0.5 - displayWidth / viewport.width / 2 + viewport.deltaX) * 2 - 1;
    const clipY: number = (0.5 - displayHeight / viewport.height / 2 + viewport.deltaY) * -2 + 1;
    const clipWidth: number = displayWidth / viewport.width * 2;
    const clipHeight: number = displayHeight / viewport.height * -2;

    // Build a matrix that will stretch our unit quad to our desired size and location
    gl.uniformMatrix3fv(matrixLocation, false, [clipWidth, 0, 0, 0, clipHeight, 0, clipX, clipY, 1]);

    // Draw the rectangle.
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  resize(viewport: Viewport): void {
    if (this.gl instanceof WebGLRenderingContext) {
      this.gl.viewport(0, 0, viewport.width, viewport.height);
    }
  }

  private createProgram(imageFormat: string): WebGLProgram {
    const gl: WebGLRenderingContext = this.gl;
    const program: WebGLProgram = gl.createProgram();

    this.program = program;

    const {fragmentShader, vertexShader} = this.createShaders(imageFormat);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
  }

  private createShaders(imageFormat: string): { fragmentShader: WebGLShader; vertexShader: WebGLShader } {
    const gl: WebGLRenderingContext = this.gl;
    const fragmentShaderSrc: string = getFragmentShaderSrc(imageFormat);

    const vertexShader: WebGLShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, VERTEX_SHADER_SRC);
    gl.compileShader(vertexShader);

    const fragmentShader: WebGLShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSrc);
    gl.compileShader(fragmentShader);

    return {fragmentShader, vertexShader};
  }

  private createTexture(image: Image): WebGLTexture {
    const gl: WebGLRenderingContext = this.gl;
    const texture: WebGLTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const {height, imageFormat, pixelData, width} = image;
    const format: GLint = getTextureFormat(gl, imageFormat);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, pixelData);

    return texture;
  }
}
