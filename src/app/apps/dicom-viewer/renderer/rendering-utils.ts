import { RenderingParameters } from './rendering-parameters';
import {
  BoundedViewportSpaceCoordinates, ImageSpaceCoordinates, RenderingProperties, ViewportSpaceCoordinates,
} from './rendering-properties';

export function getRenderingProperties(renderingParameters: RenderingParameters, imageWidth: number,
                                       imageHeight: number, viewportWidth: number,
                                       viewportHeight: number): RenderingProperties {

  const { windowCenter, windowWidth } = renderingParameters;
  const leftLimit = Math.floor(windowCenter - windowWidth / 2);
  const rightLimit = Math.floor(windowCenter + windowWidth / 2);
  const viewportSpace = computeViewportSpaceCoordinates(
    renderingParameters, imageWidth, imageHeight, viewportWidth, viewportHeight,
  );
  const { imageX0, imageY0, imageX1, imageY1, lastPixelX, lastPixelY } = viewportSpace;
  const isImageInViewport = imageY0 <= lastPixelY && imageX0 <= lastPixelX && imageY1 > 0 && imageX1 > 0;
  const renderingProperties: RenderingProperties = { isImageInViewport, leftLimit, rightLimit, viewportSpace };

  if (isImageInViewport) {
    renderingProperties.boundedViewportSpace = computeBoundedViewportSpaceCoordinates(viewportSpace);
    renderingProperties.imageSpace = computeImageSpace(renderingParameters, imageWidth, imageHeight, viewportSpace);
  }

  return renderingProperties;
}

function computeBoundedViewportSpaceCoordinates(viewportSpace: ViewportSpaceCoordinates)
  : BoundedViewportSpaceCoordinates {

  const imageX0 = Math.max(viewportSpace.imageX0, 0);
  const imageY0 = Math.max(viewportSpace.imageY0, 0);

  const imageX1 = Math.min(viewportSpace.imageX1, viewportSpace.lastPixelX);
  const imageY1 = Math.min(viewportSpace.imageY1, viewportSpace.lastPixelY);

  const imageWidth = imageX1 - imageX0 + 1;
  const imageHeight = imageY1 - imageY0 + 1;

  return { imageX0, imageY0, imageX1, imageY1, imageWidth, imageHeight };
}

function computeImageSpace(renderingParameters: RenderingParameters, imageWidth: number, imageHeight: number,
                           viewportSpace: ViewportSpaceCoordinates): ImageSpaceCoordinates {

  const { zoom } = renderingParameters;
  const displayX0 = viewportSpace.imageX0 < 0 ? Math.round(-viewportSpace.imageX0 / zoom) : 0;
  const displayY0 = viewportSpace.imageY0 < 0 ? Math.round(-viewportSpace.imageY0 / zoom) : 0;

  const displayX1 = viewportSpace.imageX1 > viewportSpace.lastPixelX
    ? imageWidth - Math.round((viewportSpace.imageX1 - viewportSpace.lastPixelX) / zoom) - 1
    : imageWidth - 1;
  const displayY1 = viewportSpace.imageY1 > viewportSpace.lastPixelY
    ? imageHeight - Math.round((viewportSpace.imageY1 - viewportSpace.lastPixelY) / zoom) - 1
    : imageHeight - 1;

  const displayWidth = displayX1 - displayX0 + 1;
  const displayHeight = displayY1 - displayY0 + 1;

  return { displayX0, displayY0, displayX1, displayY1, displayWidth, displayHeight };
}

function computeViewportSpaceCoordinates(renderingParameters: RenderingParameters, baseImageWidth: number,
                                         baseImageHeight: number, viewportWidth: number,
                                         viewportHeight: number): ViewportSpaceCoordinates {

  const { deltaX, deltaY, zoom } = renderingParameters;

  const imageWidth = Math.round(baseImageWidth * zoom);
  const imageHeight = Math.round(baseImageHeight * zoom);

  const imageX0 = Math.round(((viewportWidth - imageWidth) / 2 + deltaX * viewportWidth));
  const imageY0 = Math.round(((viewportHeight - imageHeight) / 2 + deltaY * viewportHeight));

  const imageX1 = imageX0 + imageWidth - 1;
  const imageY1 = imageY0 + imageHeight - 1;

  const lastPixelX = viewportWidth - 1;
  const lastPixelY = viewportHeight - 1;

  return { imageX0, imageY0, imageX1, imageY1, imageWidth, imageHeight, lastPixelX, lastPixelY };
}
