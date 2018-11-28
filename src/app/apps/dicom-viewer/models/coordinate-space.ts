export interface CoordinateSpace {
  // Provides LPS basis (unit vectors)
  getWorldBasis(): number[][];
  // Provides LPS origin
  getWorldOrigin(): number[];
}
