import { ViewType } from '../../constants';
import { Camera, Viewport } from '../../models';
import { math } from '../../utils/math';
import { ToolMoveListener } from '../toolbox';

export function startRotate(viewport: Viewport, downEvent: MouseEvent,
                            viewportClientRect: ClientRect): ToolMoveListener {

  if (!viewport.dataset.is3D) {
    throw new Error('Unable to rotate on a 2D dataset');
  }

  const { height, width } = viewport;
  const { top, left } = viewportClientRect;
  const trackballCenter = [width / 2, height / 2];
  const trackballRadius = Math.min(width, height) / 2;
  // Vertical position is inverted as display and camera y axis are inverted
  const cursorStartPosition = [downEvent.clientX - left, height - downEvent.clientY + top];
  let previousVector = computeTrackball(trackballCenter, trackballRadius, cursorStartPosition);

  return (moveEvent: MouseEvent) => {
    const cursorPosition = [moveEvent.clientX - left, height - moveEvent.clientY + top];
    const currentVector = computeTrackball(trackballCenter, trackballRadius, cursorPosition);
    const { angle, axis } = computeRotation(previousVector, currentVector);

    if (Math.abs(angle) > 0) {
      const camera = viewport.camera;
      rotateCamera(camera, axis, angle);
      previousVector = currentVector;

      if (viewport.viewType !== ViewType.Oblique) {
        viewport.viewType = ViewType.Oblique;
        viewport.updateAnnotations();
      }
    }
  };
}

function computeRotation(previous: number[], current: number[]): { angle: number; axis: number[] } {
  const axis = math.chain(current).cross(previous).normalize().done();
  const angle = math.angle(previous, current);
  return { axis, angle };
}

function computeTrackball(center: number[], radius: number, cursorPosition: number[]): number[] {
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

function rotateCamera(camera: Camera, axis: number[], angle: number): void {
  const newCameraBasis = math.chain(camera.getBasis())
    .transpose()
    .multiply(computeRotationMatrix(axis, angle))
    .transpose()
    .done();

  camera.eyePoint = math.subtract(camera.lookPoint, math.normalize(newCameraBasis[2])) as number[];
  camera.upVector = math.normalize(newCameraBasis[1]) as number[];
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
