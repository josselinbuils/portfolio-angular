import { Camera } from '../models';

import { math } from './maths-helpers';

export function computeTrackball(center: number[], radius: number, cursorPosition: number[]): number[] {
  const radiusSquared = radius * radius;
  let fromCenter = math.subtract(cursorPosition, center) as number[];
  const fromCenterNorm = math.norm(fromCenter) as number;

  // fromCenter cannot be longer than the trackball radius
  if (fromCenterNorm > radius) {
    fromCenter = math.multiply(fromCenter, radius / fromCenterNorm) as number[];
  }

  const fromCenterNormSquared = math.dot(fromCenter, fromCenter);
  const z = -Math.sqrt(radiusSquared - fromCenterNormSquared);
  return [...fromCenter, z];
}

export function computeRotation(previous: number[], current: number[]): { angle: number; axis: number[] } {
  const axis = math.chain(previous).cross(current).normalize().done();
  const angle = math.angle(previous, current);
  return { axis, angle };
}

export function rotateCamera(camera: Camera, axis: number[], angle: number): void {
  const rotationMatrix = computeRotationMatrix(axis, angle);
  const newCameraBasis = (math.multiply(camera.getBasis(), rotationMatrix) as number[][]).map(math.normalize);
  camera.eyePoint = math.subtract(camera.lookPoint, newCameraBasis[2]) as number[];
  camera.upVector = newCameraBasis[1] as number[];
}

function computeRotationMatrix(axis: number[], angle: number): number[][] {
  const [x, y, z] = axis;
  const cos = Math.cos(angle);
  const invCos = 1 - cos;
  const sin = Math.sin(angle);
  return [
    [cos + x * x * invCos, x * y * invCos - z * sin, x * z * invCos + y * sin],
    [y * x * invCos + z * sin, cos + y * y * invCos, y * z * invCos - x * sin],
    [z * x * invCos - y * sin, z * y * invCos + x * sin, cos + z * z * invCos],
  ];
}
