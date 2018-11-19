import * as math from 'mathjs';

import { Camera, DicomDataset, Frame } from '../models';

const DEBUG = false;

// TODO improve this
export function findFrame(dataset: DicomDataset, camera: Camera): Frame {
  if (DEBUG) { console.time('binary'); }
  const frames = dataset.frames;
  const direction = camera.getDirection();
  let index = Math.floor(dataset.frames.length / 2);
  let left = 0;
  let right = frames.length - 1;

  if (right === 0) {
    return frames[0];
  }

  while (right !== left) {
    const previousFrameDistance = math.chain(frames[index - 1].imageCenter)
      .subtract(camera.lookPoint)
      .dot(direction)
      .abs()
      .done();

    if (previousFrameDistance < Number.EPSILON) {
      if (DEBUG) { console.timeEnd('binary'); }
      return frames[index - 1];
    }

    const frameDistance = math.chain(frames[index].imageCenter)
      .subtract(camera.lookPoint)
      .dot(direction)
      .abs()
      .done();

    if (frameDistance < Number.EPSILON) {
      if (DEBUG) { console.timeEnd('binary'); }
      return frames[index];
    }

    const dir = previousFrameDistance < frameDistance ? -1 : 1;

    if (dir < 0) {
      right = index;
    } else {
      left = index;
    }

    index += Math.ceil((right - left) / 2) * dir;
  }
  throw new Error('Unable to find frame');
}
