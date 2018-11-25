import { math } from '../../helpers/maths-helpers';
import { Viewport } from '../../models';
import { ToolMoveListener } from '../toolbox';

const PAGING_SENSIBILITY = 1.2;

export function startPaging(viewport: Viewport, downEvent: MouseEvent): ToolMoveListener {
  const startY = downEvent.clientY;
  const { camera } = viewport;

  const direction = camera.getDirection();
  const startLookPoint = camera.lookPoint;
  let currentLookPoint = camera.lookPoint;

  const { max, min } = viewport.dataset.getLimitsAlongAxe(direction);

  const correctLookPoint = (point: number[]) => {
    const correctionVectorNorm = math.chain(point).subtract(camera.lookPoint).dot(direction).done();
    const correctionVector = math.multiply(direction, correctionVectorNorm);
    return math.add(camera.lookPoint, correctionVector) as number[];
  };

  return (moveEvent: MouseEvent) => {
    const sensitivity = (max.positionOnAxe - min.positionOnAxe) / viewport.height * PAGING_SENSIBILITY;
    const deltaPosition = (startY - moveEvent.clientY) * sensitivity;
    let newLookPoint = math.add(startLookPoint, math.multiply(direction, deltaPosition)) as number[];
    const positionOnDirection = math.dot(newLookPoint, direction);

    if (positionOnDirection < min.positionOnAxe) {
      newLookPoint = correctLookPoint(min.point);
    } else if (positionOnDirection > max.positionOnAxe) {
      newLookPoint = correctLookPoint(max.point);
    }

    if (math.distance(newLookPoint, currentLookPoint) > Number.EPSILON) {
      camera.lookPoint = newLookPoint;
      camera.eyePoint = math.subtract(camera.lookPoint, direction) as number[];
      currentLookPoint = newLookPoint;
    }
  };
}
