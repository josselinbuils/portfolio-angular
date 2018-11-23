import { Camera, Frame, Volume } from '../models';

import { math } from './maths-helpers';

export function convertImageToLPS(point: number[], imageWidth: number, imageHeight: number, camera: Camera,
                                  volume: Volume): number[] {

  const cameraBasis = camera.getBasis();
  const x = math.chain(cameraBasis[0]).dotMultiply(volume.voxelSpacing);
  const y = math.chain(cameraBasis[1]).dotMultiply(volume.voxelSpacing);

  return math.chain(camera.lookPoint)
    .add(x.multiply(-(imageWidth - 1) / 2 + point[0]).done())
    .add(y.multiply(-(imageHeight - 1) / 2 + point[1]).done())
    .done();
}

export function convertLPSToImage(point: number[], frame: Frame, volume: Volume): number[] {
  const { imagePosition, imageOrientation } = frame;

  const imagePositionToPoint = math.chain(point)
    .subtract(imagePosition)
    .dotDivide(volume.voxelSpacing);

  return [
    imagePositionToPoint.dot(imageOrientation[0]).done(),
    imagePositionToPoint.dot(imageOrientation[1]).done(),
  ];
}

export function getDistanceBetweenPoints(pointA: number[], pointB: number[], axe: number[]): number {
  const vector = math.chain(pointA).subtract(pointB);
  return axe !== undefined ? vector.dot(axe).abs().done() : vector.norm().done();
}
