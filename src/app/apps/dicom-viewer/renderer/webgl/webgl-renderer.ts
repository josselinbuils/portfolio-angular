import { NormalizedImageFormat } from '../../constants';
import { DicomFrame } from '../../dicom-frame';
import { Viewport } from '../../models/viewport';
import { Renderer } from '../renderer';

import { getFragmentShaderSrc, getTextureFormat } from './fragment-shader';
import { VERTEX_SHADER_SRC } from './vertex-shader';

export class WebGLRenderer implements Renderer {

  private readonly gl: WebGLRenderingContext;
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
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }

  render(viewport: Viewport): void {
    const gl = this.gl;
    const { height, imageFormat, rescaleIntercept, rescaleSlope, width } = viewport.image;

    if (this.program === undefined) {
      this.program = this.createProgram(imageFormat);
    }

    gl.deleteTexture(this.texture);
    this.texture = this.createTexture(viewport.image);

    // Look up where the vertex data needs to go.
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');

    // Provide texture coordinates for the rectangle.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    if (imageFormat !== NormalizedImageFormat.RGB) {
      // Look up uniform locations
      const rescaleInterceptLocation = gl.getUniformLocation(this.program, 'rescaleIntercept');
      const rescaleSlopeLocation = gl.getUniformLocation(this.program, 'rescaleSlope');
      const windowCenterLocation = gl.getUniformLocation(this.program, 'windowCenter');
      const windowWidthLocation = gl.getUniformLocation(this.program, 'windowWidth');

      gl.uniform1f(rescaleInterceptLocation, rescaleIntercept);
      gl.uniform1f(rescaleSlopeLocation, rescaleSlope);
      gl.uniform1f(windowWidthLocation, viewport.windowWidth);
      gl.uniform1f(windowCenterLocation, viewport.windowCenter);
    }

    const matrixLocation = gl.getUniformLocation(this.program, 'u_matrix');

    // Convert dst pixel coordinates to clip space coordinates
    const displayWidth = Math.round(width * viewport.zoom);
    const displayHeight = Math.round(height * viewport.zoom);
    const clipX = (0.5 - displayWidth / viewport.width / 2 + viewport.deltaX) * 2 - 1;
    const clipY = (0.5 - displayHeight / viewport.height / 2 + viewport.deltaY) * -2 + 1;
    const clipWidth = displayWidth / viewport.width * 2;
    const clipHeight = displayHeight / viewport.height * -2;

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

  private createProgram(imageFormat: NormalizedImageFormat): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();

    this.program = program;

    const { fragmentShader, vertexShader } = this.createShaders(imageFormat);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
  }

  private createShaders(imageFormat: NormalizedImageFormat): {
    fragmentShader: WebGLShader; vertexShader: WebGLShader;
  } {
    const gl = this.gl;
    const fragmentShaderSrc = getFragmentShaderSrc(imageFormat);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, VERTEX_SHADER_SRC);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSrc);
    gl.compileShader(fragmentShader);

    return { fragmentShader, vertexShader };
  }

  private createTexture(image: DicomFrame): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const { height, imageFormat, width } = image;
    const format = getTextureFormat(gl, imageFormat);
    const pixelData = new Uint8Array(image.pixelData.buffer, image.pixelData.byteOffset);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, pixelData);

    return texture;
  }
}
