import * as math from 'mathjs';

import { Camera, Dataset, Frame, Volume } from '../models';

function findClosestFramesLinear(dataset: Dataset, point: number[]): { distance: number; frame: Frame }[] {
  const frames = dataset.frames;
  let closestFrames: { distance: number; frame: Frame }[] = frames.slice(0, 2)
    .map(frame => {
      const distance = getDistanceBetweenPoints(frame.imageCenter, point);
      return { distance, frame };
    })
    .sort((a, b) => a.distance > b.distance ? 1 : -1);

  for (const frame of dataset.frames) {
    const distance = getDistanceBetweenPoints(frame.imageCenter, point);

    if (distance < closestFrames[0].distance) {
      closestFrames = [{ distance, frame }, closestFrames[0]];
    } else if (distance < closestFrames[1].distance) {
      closestFrames = [closestFrames[0], { distance, frame }];
    }
  }

  return closestFrames;
}

export function getDistanceBetweenPoints(pointA: number[], pointB: number[], axe?: number[]): number {
  const vector = math.chain(pointA).subtract(pointB);
  return axe !== undefined ? vector.dot(axe).abs().done() : vector.norm().done();
}

// Provides dimensions in pixels, works only with canonical orientations
export function getSliceDimensions(volume: Volume, camera: Camera): { width: number; height: number } {
  const direction = camera.getDirection();
  const right = math.cross(direction, camera.upVector);
  console.log(direction, camera.upVector, right);

  const width = Math.max(...volume.orientedDimensionsVoxels
    .map(orientedDimension => math.chain(orientedDimension).dot(right).abs().done()));

  const height = Math.max(...volume.orientedDimensionsVoxels
    .map(orientedDimension => math.chain(orientedDimension).dot(camera.upVector).abs().done()));

  return { width, height };
}
