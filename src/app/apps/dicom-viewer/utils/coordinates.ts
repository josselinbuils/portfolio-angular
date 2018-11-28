import { CoordinateSpace } from '../models';

import { math } from './math';

export class Coordinates {
  private static cache: { [key: string]: { from: number[][]; to: number[][] } } = {};

  static convert(point: number[], originalSpace: CoordinateSpace, finalSpace: CoordinateSpace): number[] {
    const originalSpaceToWorldMatrix = this.getWorldTransformationMatrix(originalSpace).to;
    const worldPoint = math.multiply(originalSpaceToWorldMatrix, [...point, 1]) as number[];
    const worldToFinalSpaceMatrix = this.getWorldTransformationMatrix(finalSpace).from;
    return (math.multiply(worldToFinalSpaceMatrix, worldPoint) as number[]).slice(0, 3);
  }

  private static getWorldTransformationMatrix(space: CoordinateSpace): { from: number[][]; to: number[][] } {
    const basis = space.getWorldBasis();
    const origin = space.getWorldOrigin();
    const cacheKey = JSON.stringify([basis, origin]);

    if (this.cache[cacheKey] === undefined) {
      // Translation
      const translationVector = math.chain(basis).multiply(origin).multiply(-1).done();

      const from = [
        [...basis[0], translationVector[0]],
        [...basis[1], translationVector[1]],
        [...basis[2], translationVector[2]],
        [0, 0, 0, 1],
      ];
      const to = math.inv(from) as number[][];

      if (Object.values(this.cache).length > 10) {
        this.cache = {};
      }
      this.cache[cacheKey] = { from, to };
    }

    return this.cache[cacheKey];
  }
}
