import { ImageFormat } from '../../constants';

import { FORMATTER, GRAYSCALE_FRAGMENT_SHADER_SRC } from './fragment/grayscale';
import { RGB_FRAGMENT_SHADER_SRC } from './fragment/rgb';

export function getTextureFormat(gl: WebGLRenderingContext, imageFormat: string): any {

  const textureMap: { [imageFormat: string]: GLenum } = {
    int8: gl.LUMINANCE,
    int16: gl.LUMINANCE_ALPHA,
    uint8: gl.LUMINANCE,
    uint16: gl.LUMINANCE_ALPHA,
    rgb: gl.RGB,
  };
  const texture = textureMap[imageFormat];

  if (texture === undefined) {
    throw new Error(`Unknown image format: ${imageFormat}`);
  }
  return texture;
}

export function getFragmentShaderSrc(imageFormat: ImageFormat): string {
  let shaderSrc: string;

  if (imageFormat === ImageFormat.RGB) {
    shaderSrc = RGB_FRAGMENT_SHADER_SRC;
  } else if (FORMATTER[imageFormat] !== undefined) {
    shaderSrc = GRAYSCALE_FRAGMENT_SHADER_SRC.replace('FORMATTER', FORMATTER[imageFormat]);
  } else {
    throw new Error(`Unknown image format: ${imageFormat}`);
  }

  return shaderSrc;
}
