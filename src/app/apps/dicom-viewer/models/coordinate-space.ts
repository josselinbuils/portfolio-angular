export interface CoordinateSpace {
  fromWorld(world: CoordinateSpace): number[][];
  // Provides LPS basis (unit vectors)
  getWorldBasis(): number[][];
  // Provides LPS origin
  getWorldOrigin(): number[];
  toWorld(world: CoordinateSpace): number[][];
}
