import { Viewport } from '../models';

import { math } from './math';

export function convertDisplayToLPS(point: number[], viewport: Viewport): number[] {

  const viewportBasis = viewport.getBasis();
  const zoom = viewport.getImageZoom();

  const xStepVector = math.chain(viewportBasis[0])
    .dotMultiply(viewport.dataset.voxelSpacing)
    .divide(zoom);

  const yStepVector = math.chain(viewportBasis[1])
    .dotMultiply(viewport.dataset.voxelSpacing)
    .divide(zoom);

  return math.chain(viewport.getOrigin())
    .add(xStepVector.multiply(point[0]).done())
    .add(yStepVector.multiply(point[1]).done())
    .done();
}

export function convertLPSToDisplay(point: number[], viewport: Viewport): number[] {
  const viewportBasis = viewport.getBasis();
  const zoom = viewport.getImageZoom();

  const viewportOriginToPointVoxels = math.chain(point)
    .subtract(viewport.getOrigin())
    .dotDivide(viewport.dataset.voxelSpacing)
    .multiply(zoom);

  return [
    viewportOriginToPointVoxels.dot(viewportBasis[0]).done() as number,
    viewportOriginToPointVoxels.dot(viewportBasis[1]).done() as number,
  ];
}
