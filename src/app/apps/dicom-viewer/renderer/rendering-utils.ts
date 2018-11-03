import { Viewport } from '../models/viewport';

import { RenderingProperties } from './rendering-properties';

export function createImageData(context: CanvasRenderingContext2D, data: Uint8ClampedArray, width: number,
                                height: number): ImageData {
  let imageData: ImageData;

  try {
    imageData = new ImageData(data, width, height);
  } catch (error) {
    imageData = context.createImageData(width, height);
    imageData.data.set(data);
  }

  return imageData;
}

export function getRenderingProperties(viewport: Viewport): RenderingProperties {

  const leftLimit = Math.floor(viewport.windowLevel - viewport.windowWidth / 2);
  const rightLimit = Math.floor(viewport.windowLevel + viewport.windowWidth / 2);

  const imageWidth = Math.round(viewport.image.width * viewport.zoom);
  const imageHeight = Math.round(viewport.image.height * viewport.zoom);

  const x0 = Math.round(((viewport.width - imageWidth) / 2 + viewport.deltaX * viewport.width));
  const x1 = x0 + imageWidth - 1;

  const y0 = Math.round(((viewport.height - imageHeight) / 2 + viewport.deltaY * viewport.height));
  const y1 = y0 + imageHeight - 1;

  const displayX0 = Math.max(x0, 0);
  const displayX1 = Math.min(x1, viewport.width - 1);

  const displayY0 = Math.max(y0, 0);
  const displayY1 = Math.min(y1, viewport.height - 1);

  const displayWidth = Math.max(displayX1 - displayX0 + 1, 0);
  const displayHeight = Math.max(displayY1 - displayY0 + 1, 0);

  return {
    displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, imageWidth, imageHeight, leftLimit,
    rightLimit, x0, x1, y0, y1,
  };
}
