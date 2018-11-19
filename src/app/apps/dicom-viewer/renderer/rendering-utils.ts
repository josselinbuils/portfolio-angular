import { RenderingParameters } from './rendering-parameters';
import { RenderingProperties } from './rendering-properties';

export function getRenderingProperties(renderingParameters: RenderingParameters, width: number,
                                       height: number): RenderingProperties {

  const { deltaX, deltaY, frame: { columns, rows }, windowCenter, windowWidth, zoom } = renderingParameters;

  const leftLimit = Math.floor(windowCenter - windowWidth / 2);
  const rightLimit = Math.floor(windowCenter + windowWidth / 2);

  const imageWidth = Math.round(columns * zoom);
  const imageHeight = Math.round(rows * zoom);

  const x0 = Math.round(((width - imageWidth) / 2 + deltaX * width));
  const x1 = x0 + imageWidth - 1;

  const y0 = Math.round(((height - imageHeight) / 2 + deltaY * height));
  const y1 = y0 + imageHeight - 1;

  const displayX0 = Math.max(x0, 0);
  const displayX1 = Math.min(x1, width - 1);

  const displayY0 = Math.max(y0, 0);
  const displayY1 = Math.min(y1, height - 1);

  const displayWidth = Math.max(displayX1 - displayX0 + 1, 0);
  const displayHeight = Math.max(displayY1 - displayY0 + 1, 0);

  return {
    displayHeight, displayWidth, displayX0, displayX1, displayY0, displayY1, imageWidth, imageHeight, leftLimit,
    rightLimit, x0, x1, y0, y1,
  };
}
