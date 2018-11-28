import { V } from '../math';
import { Camera, Frame, Viewport, Volume } from '../models';
import { convert } from '../utils/coordinates';

import {
  BoundedViewportSpaceCoordinates, ImageSpaceCoordinates, RenderingProperties, ViewportSpaceCoordinates,
} from './rendering-properties';

export function getRenderingProperties(viewport: Viewport): RenderingProperties | undefined {

  const { camera, dataset, height, windowCenter, windowWidth } = viewport;

  const leftLimit = Math.floor(windowCenter - windowWidth / 2);
  const rightLimit = Math.floor(windowCenter + windowWidth / 2);

  let imageWidth: number;
  let imageHeight: number;
  let viewportSpaceImageX0: number | undefined;
  let viewportSpaceImageY0: number | undefined;
  let widthCorrectionRatio: number;
  let zoom: number;
  let imageLookPoint: number[] | undefined;

  if (viewport.dataset.is3D) {
    const imageDimensions = getImageDimensions(viewport);

    if (imageDimensions === undefined) {
      return undefined;
    }

    imageWidth = imageDimensions.width;
    imageHeight = imageDimensions.height;
    viewportSpaceImageX0 = imageDimensions.viewportSpaceImageX0;
    viewportSpaceImageY0 = imageDimensions.viewportSpaceImageY0;
    widthCorrectionRatio = imageDimensions.widthRatio;
    imageLookPoint = imageDimensions.imageLookPoint;
    zoom = height / imageDimensions.height * imageDimensions.fieldOfView / camera.fieldOfView;

  } else {
    const frame = dataset.findClosestFrame(camera.lookPoint);
    const { columns, rows } = frame;
    imageWidth = columns;
    imageHeight = rows;
    // TODO Put real value
    widthCorrectionRatio = 1;
    zoom = height / frame.rows * camera.baseFieldOfView / camera.fieldOfView;
  }

  const viewportSpace = computeViewportSpaceCoordinates(
    viewport, zoom, imageWidth, imageHeight, widthCorrectionRatio, viewportSpaceImageX0, viewportSpaceImageY0,
  );

  const { imageX0, imageY0, imageX1, imageY1, lastPixelX, lastPixelY } = viewportSpace;
  const isImageInViewport = imageY0 <= lastPixelY && imageX0 <= lastPixelX && imageY1 > 0 && imageX1 > 0;

  if (!isImageInViewport) {
    return undefined;
  }

  const boundedViewportSpace = computeBoundedViewportSpaceCoordinates(viewportSpace);
  const imageSpace = computeImageSpace(zoom, imageWidth, imageHeight, widthCorrectionRatio, viewportSpace);

  return {
    boundedViewportSpace, imageLookPoint, imageSpace, leftLimit, rightLimit, viewportSpace, widthCorrectionRatio, zoom,
  };
}

export function validateCamera2D(frame: Frame, camera: Camera): void {
  const isDirectionValid = Math.abs(V(camera.getDirection()).angle(frame.imageNormal)) < Number.EPSILON;

  if (!isDirectionValid) {
    throw new Error('Camera direction is not collinear with the frame normal');
  }

  // Frame vertical axis is inverted compared to axial view
  const isUpVectorValid = (Math.abs(V(camera.upVector).angle(frame.imageOrientation[1])) - Math.PI) < Number.EPSILON;

  if (!isUpVectorValid) {
    throw new Error('Camera up vector does not match the frame orientation');
  }

  const cameraFrameDistance = Math.abs(V(camera.lookPoint).sub(frame.imagePosition).dot(camera.getDirection()));

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
                           viewportSpace: ViewportSpaceCoordinates): ImageSpaceCoordinates {

  const displayX0 = viewportSpace.imageX0 < 0 ? Math.round(-viewportSpace.imageX0 / zoom / widthCorrectionRatio) : 0;
  const displayY0 = viewportSpace.imageY0 < 0 ? Math.round(-viewportSpace.imageY0 / zoom) : 0;

  const displayX1 = viewportSpace.imageX1 > viewportSpace.lastPixelX
    ? imageWidth - Math.round((viewportSpace.imageX1 - viewportSpace.lastPixelX) / zoom / widthCorrectionRatio) - 1
    : imageWidth - 1;
  const displayY1 = viewportSpace.imageY1 > viewportSpace.lastPixelY
    ? imageHeight - Math.round((viewportSpace.imageY1 - viewportSpace.lastPixelY) / zoom) - 1
    : imageHeight - 1;

  const displayWidth = displayX1 - displayX0 + 1;
  const displayHeight = displayY1 - displayY0 + 1;

  return { displayX0, displayY0, displayX1, displayY1, displayWidth, displayHeight };
}

function computeViewportSpaceCoordinates(viewport: Viewport, zoom: number, baseImageWidth: number,
                                         baseImageHeight: number, widthCorrectionRatio: number,
                                         viewportSpaceImageX0: number | undefined,
                                         viewportSpaceImageY0: number | undefined): ViewportSpaceCoordinates {

  const { deltaX, deltaY, height, width } = viewport;

  const imageWidth = Math.round(baseImageWidth * zoom * widthCorrectionRatio);
  const imageHeight = Math.round(baseImageHeight * zoom);

  const imageX0 = viewportSpaceImageX0 !== undefined
    ? Math.round(viewportSpaceImageX0 + deltaX * width)
    : Math.round(((width - imageWidth) / 2 + deltaX * width));

  const imageY0 = viewportSpaceImageY0 !== undefined
    ? Math.round(viewportSpaceImageY0 + deltaY * height)
    : Math.round(((height - imageHeight) / 2 + deltaY * height));

  const imageX1 = imageX0 + imageWidth - 1;
  const imageY1 = imageY0 + imageHeight - 1;

  const lastPixelX = width - 1;
  const lastPixelY = height - 1;

  return { imageX0, imageY0, imageX1, imageY1, imageWidth, imageHeight, lastPixelX, lastPixelY };
}

// TODO Optimize this
function getImageDimensions(viewport: Viewport): {
  fieldOfView: number; height: number; imageLookPoint: number[]; viewportSpaceImageX0: number;
  viewportSpaceImageY0: number; width: number; widthRatio: number;
} | undefined {
  // Compute volume limits in computer service
  const { camera, dataset } = viewport;
  const { voxelSpacing } = dataset;
  const cameraBasis = viewport.getWorldBasis();
  const cameraOrigin = viewport.getWorldOrigin();
  const halfSpacing = V(dataset.voxelSpacing).mul(0.5);
  const halfHorizontalSpacing = Math.abs(halfSpacing.dot(cameraBasis[0]));
  const halfVerticalSpacing = Math.abs(halfSpacing.dot(cameraBasis[1]));
  const plane = [
    cameraOrigin,
    V(cameraOrigin).add(cameraBasis[0]),
    V(cameraOrigin).add(cameraBasis[1]),
  ];
  const intersections = (dataset.volume as Volume).getIntersections(plane);

  if (intersections.length === 0) {
    return undefined;
  }

  let minHorizontal = Number.MAX_SAFE_INTEGER;
  let maxHorizontal = -Number.MAX_SAFE_INTEGER;
  let maxVertical = -Number.MAX_SAFE_INTEGER;
  let minVertical = Number.MAX_SAFE_INTEGER;
  let maxHorizontalMm = -Number.MAX_SAFE_INTEGER;
  let minHorizontalMm = Number.MAX_SAFE_INTEGER;
  let maxVerticalMm = -Number.MAX_SAFE_INTEGER;
  let minVerticalMm = Number.MAX_SAFE_INTEGER;
  let viewportSpaceImageX0 = 0;
  let viewportSpaceImageY0 = 0;
  let viewportSpaceImageX1 = 0;
  let viewportSpaceImageY1 = 0;

  for (const intersection of intersections) {
    const left = V(intersection).dot(cameraBasis[0]) / Math.abs(V(voxelSpacing).dot(cameraBasis[0]));
    const top = V(intersection).dot(cameraBasis[1]) / Math.abs(V(voxelSpacing).dot(cameraBasis[1]));
    const cornerCamera = convert(intersection, dataset, camera, dataset) as number[];
    const leftMm = cornerCamera[0];
    const topMm = cornerCamera[1];

    if (left < minHorizontal) {
      minHorizontal = left - 0.5;
      viewportSpaceImageX0 = Math.round(convert(intersection, dataset, viewport, dataset)[0]);
    }
    if (left > maxHorizontal) {
      maxHorizontal = left + 0.5;
      viewportSpaceImageX1 = Math.round(convert(intersection, dataset, viewport, dataset)[0]);
    }
    if (top < minVertical) {
      minVertical = top - 0.5;
      viewportSpaceImageY0 = Math.round(convert(intersection, dataset, viewport, dataset)[1]);
    }
    if (top > maxVertical) {
      maxVertical = top + 0.5;
      viewportSpaceImageY1 = Math.round(convert(intersection, dataset, viewport, dataset)[1]);
    }
    if (leftMm < minHorizontalMm) {
      minHorizontalMm = leftMm - halfHorizontalSpacing;
    }
    if (leftMm > maxHorizontalMm) {
      maxHorizontalMm = leftMm + halfHorizontalSpacing;
    }
    if (topMm < minVerticalMm) {
      minVerticalMm = topMm - halfVerticalSpacing;
    }
    if (topMm > maxVerticalMm) {
      maxVerticalMm = topMm + halfVerticalSpacing;
    }
  }

  const width = Math.round(maxHorizontal - minHorizontal);
  const height = Math.round(maxVertical - minVertical);
  const widthMm = Math.round(maxHorizontalMm - minHorizontalMm);
  const heightMm = Math.round(maxVerticalMm - minVerticalMm);
  const imageLookPointViewport = [
    viewportSpaceImageX0 + (viewportSpaceImageX1 - viewportSpaceImageX0) / 2 - 0.5,
    viewportSpaceImageY0 + (viewportSpaceImageY1 - viewportSpaceImageY0) / 2 - 0.5,
    0,
  ];
  const imageLookPoint = convert(imageLookPointViewport, viewport, dataset, dataset);

  // V(viewport.getWorldOrigin())
  // .add(V(viewportBasis[0]).mul(imageLookPointViewport[0]))
  // .add(V(viewportBasis[1]).mul(imageLookPointViewport[1]));

  console.log('viewportSpaceImageX0', viewportSpaceImageX0, width);

  console.log('imageLookPointViewport', imageLookPointViewport, 'lookPoint', viewport.camera.lookPoint,
    'imageLookPoint', imageLookPoint);

  // Height is the reference
  const widthRatio = 1 / ((width / height) * (heightMm / widthMm));
  const fieldOfView = heightMm;

  return { fieldOfView, height, imageLookPoint, viewportSpaceImageX0, viewportSpaceImageY0, width, widthRatio };
}
