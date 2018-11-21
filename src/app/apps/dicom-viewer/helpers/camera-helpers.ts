import * as math from 'mathjs';

import { Camera, DicomDataset, Frame } from '../models';

const DEBUG = false;

export function findFrame(dataset: DicomDataset, camera: Camera): Frame {
  try {
    return findFrameBinary(dataset, camera);
  } catch (error) {
    console.warn('Unable to find frame using binary search, use linear search instead');
    return findFrameLinear(dataset, camera);
  }
}

// TODO improve this
function findFrameBinary(dataset: DicomDataset, camera: Camera): Frame {
  if (DEBUG) { console.time(); }

  const frames = dataset.frames;

  if (frames.length === 1) {
    return frames[0];
  }

  const direction = camera.getDirection();
  let index = Math.floor(dataset.frames.length / 2);
  let left = 0;
  let right = frames.length - 1;

  while (true) {
    const previousFrameDistance = getDistanceBetweenPoints(frames[index - 1].imageCenter, camera.lookPoint, direction);

    if (previousFrameDistance < Number.EPSILON) {
      if (DEBUG) { console.timeEnd(); }
      return frames[index - 1];
    }

    const frameDistance = getDistanceBetweenPoints(frames[index].imageCenter, camera.lookPoint, direction);

    if (frameDistance < Number.EPSILON) {
      if (DEBUG) { console.timeEnd(); }
      return frames[index];
    }

    const dir = previousFrameDistance < frameDistance ? -1 : 1;

    if (dir < 0 && right !== index) {
      right = index;
    } else if (left !== index) {
      left = index;
    } else {
      console.log('Binary search:');
      console.log(`- slice ${index - 1} with a distance of ${previousFrameDistance}mm`);
      console.log(`- slice ${index} with a distance of ${frameDistance}mm`);
      break;
    }

    index += Math.ceil((right - left) / 2) * dir;
  }
  throw new Error('Unable to find frame');
}

function findFrameLinear(dataset: DicomDataset, camera: Camera): Frame {
  const direction = camera.getDirection();

  for (const frame of dataset.frames) {
    const distance = getDistanceBetweenPoints(frame.imageCenter, camera.lookPoint, direction);

    if (distance < Number.EPSILON) {
      console.log(`Linear search: slice ${dataset.frames.indexOf(frame)} with a distance of ${distance}mm`);
      return frame;
    }
  }
  throw new Error('Unable to find frame');
}

function getDistanceBetweenPoints(pointA: number[], pointB: number[], axe: number[]): number {
  return math.chain(pointA).subtract(pointB).dot(axe).abs().done();
}
