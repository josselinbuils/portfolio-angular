import { Camera, Frame } from '../models';
import { math } from '../utils/math';

import { RenderingParameters } from './rendering-parameters';
import {
  BoundedViewportSpaceCoordinates, ImageSpaceCoordinates, RenderingProperties, ViewportSpaceCoordinates,
} from './rendering-properties';

export function getRenderingProperties(renderingParameters: RenderingParameters, zoom: number, imageWidth: number,
                                       widthCorrectionRatio: number, heightCorrectionRatio: number,
                                       imageHeight: number, viewportWidth: number,
                                       viewportHeight: number): RenderingProperties {

  const { windowCenter, windowWidth } = renderingParameters;

  const leftLimit = Math.floor(windowCenter - windowWidth / 2);
  const rightLimit = Math.floor(windowCenter + windowWidth / 2);

  const viewportSpace = computeViewportSpaceCoordinates(
    renderingParameters, zoom, imageWidth, imageHeight, widthCorrectionRatio, heightCorrectionRatio, viewportWidth,
    viewportHeight,
  );

  const { imageX0, imageY0, imageX1, imageY1, lastPixelX, lastPixelY } = viewportSpace;
  const isImageInViewport = imageY0 <= lastPixelY && imageX0 <= lastPixelX && imageY1 > 0 && imageX1 > 0;

  const renderingProperties: RenderingProperties = { isImageInViewport, leftLimit, rightLimit, viewportSpace };

  if (isImageInViewport) {
    renderingProperties.boundedViewportSpace = computeBoundedViewportSpaceCoordinates(viewportSpace);
    renderingProperties.imageSpace = computeImageSpace(
      zoom, imageWidth, imageHeight, widthCorrectionRatio, heightCorrectionRatio, viewportSpace,
    );
  }

  return renderingProperties;
}

export function validateCamera2D(frame: Frame, camera: Camera): void {
  const isDirectionValid = math.chain(camera.getDirection()).angle(frame.imageNormal).equal(0).done();

  if (!isDirectionValid) {
    throw new Error('Camera direction is not collinear with the frame normal');
  }

  // Frame vertical axis is inverted compared to axial view
  const isUpVectorValid = math.chain(camera.upVector).angle(frame.imageOrientation[1]).abs().equal(Math.PI).done();

  if (!isUpVectorValid) {
    throw new Error('Camera up vector does not match the frame orientation');
  }

  const cameraFrameDistance = math.chain(camera.lookPoint)
    .subtract(frame.imagePosition)
    .dot(camera.getDirection())
    .abs()
    .done();

  if (cameraFrameDistance > frame.spacingBetweenSlices) {
    throw new Error(`lookPoint shall be on the frame (${cameraFrameDistance}mm)`);
  }
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

function computeImageSpace(zoom: number, imageWidth: number, imageHeight: number, widthCorrectionRatio: number,
                           heightCorrectionRatio: number,
                           viewportSpace: ViewportSpaceCoordinates): ImageSpaceCoordinates {

  const displayX0 = viewportSpace.imageX0 < 0 ? Math.round(-viewportSpace.imageX0 / zoom / widthCorrectionRatio) : 0;
  const displayY0 = viewportSpace.imageY0 < 0 ? Math.round(-viewportSpace.imageY0 / zoom / heightCorrectionRatio) : 0;

  const displayX1 = viewportSpace.imageX1 > viewportSpace.lastPixelX
    ? imageWidth - Math.round((viewportSpace.imageX1 - viewportSpace.lastPixelX) / zoom / widthCorrectionRatio) - 1
    : imageWidth - 1;
  const displayY1 = viewportSpace.imageY1 > viewportSpace.lastPixelY
    ? imageHeight - Math.round((viewportSpace.imageY1 - viewportSpace.lastPixelY) / zoom / heightCorrectionRatio) - 1
    : imageHeight - 1;

  const displayWidth = displayX1 - displayX0 + 1;
  const displayHeight = displayY1 - displayY0 + 1;

  return { displayX0, displayY0, displayX1, displayY1, displayWidth, displayHeight };
}

function computeViewportSpaceCoordinates(renderingParameters: RenderingParameters, zoom: number, baseImageWidth: number,
                                         baseImageHeight: number, widthCorrectionRatio: number,
                                         heightCorrectionRatio: number, viewportWidth: number,
                                         viewportHeight: number): ViewportSpaceCoordinates {

  const { deltaX, deltaY } = renderingParameters;

  const imageWidth = Math.round(baseImageWidth * zoom * widthCorrectionRatio);
  const imageHeight = Math.round(baseImageHeight * zoom * heightCorrectionRatio);

  const imageX0 = Math.round(((viewportWidth - imageWidth) / 2 + deltaX * viewportWidth));
  const imageY0 = Math.round(((viewportHeight - imageHeight) / 2 + deltaY * viewportHeight));

  const imageX1 = imageX0 + imageWidth - 1;
  const imageY1 = imageY0 + imageHeight - 1;

  const lastPixelX = viewportWidth - 1;
  const lastPixelY = viewportHeight - 1;

  return { imageX0, imageY0, imageX1, imageY1, imageWidth, imageHeight, lastPixelX, lastPixelY };
}
