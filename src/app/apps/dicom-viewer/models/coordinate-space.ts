export interface CoordinateSpace {
  // Provides LPS basis vectors in mm
  getBasis(): number[][];
  // Provides LPS origin
  getOrigin(): number[];
}
