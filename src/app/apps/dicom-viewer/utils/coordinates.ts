import { CoordinateSpace } from '../models';

import { math } from './math';

// TODO limit size
const cache = {};

export function convert(point: number[], originalSpace: CoordinateSpace, finalSpace: CoordinateSpace,
                        world: CoordinateSpace): any {

  const worldPoint = math.multiply(originalSpace.toWorld(world), [...point, 1]);
  return (math.multiply(finalSpace.fromWorld(world), worldPoint) as number[]).slice(0, 3);
}

export function getFromWorldTransformationMatrix(world: CoordinateSpace, space: CoordinateSpace): number[][] {
  const basis = space.getWorldBasis();
  const origin = space.getWorldOrigin();
  const cacheKey = JSON.stringify([basis, origin]);

  if (cache[cacheKey] === undefined) {
    // Translation
    const translationVector = math.chain(basis).multiply(origin).multiply(-1).done();

    cache[cacheKey] = [
      [...basis[0], translationVector[0]],
      [...basis[1], translationVector[1]],
      [...basis[2], translationVector[2]],
      [0, 0, 0, 1],
    ];
  }

  return cache[cacheKey];
}
