import { FORMATTER, GRAYSCALE_FRAGMENT_SHADER_SRC } from './fragment/grayscale';
import { RGB_FRAGMENT_SHADER_SRC } from './fragment/rgb';

export function getTextureFormat(gl: WebGLRenderingContext, imageFormat: string): any {

  const texture: any = {
    int8: gl.LUMINANCE,
    int16: gl.LUMINANCE_ALPHA,
    uint8: gl.LUMINANCE,
    uint16: gl.LUMINANCE_ALPHA,
    rgb: gl.RGB,
  };

  if (!texture[imageFormat]) {
    throw new Error(`Unknown image format: ${imageFormat}`);
  }

  return texture[imageFormat];
}

export function getFragmentShaderSrc(imageFormat: string): string {
  let shaderSrc: string;

  if (imageFormat === 'rgb') {
    shaderSrc = RGB_FRAGMENT_SHADER_SRC;
  } else if (FORMATTER[imageFormat]) {
    shaderSrc = GRAYSCALE_FRAGMENT_SHADER_SRC.replace('FORMATTER', FORMATTER[imageFormat]);
  } else {
    throw new Error(`Unknown image format: ${imageFormat}`);
  }

  return shaderSrc;
}
