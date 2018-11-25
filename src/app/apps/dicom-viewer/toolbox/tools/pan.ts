import { Viewport } from '../../models';
import { ToolMoveListener } from '../toolbox';

const DELTA_LIMIT = 0.02;

export function startPan(viewport: Viewport, downEvent: MouseEvent): ToolMoveListener {
  const startX = downEvent.clientX - viewport.deltaX * viewport.width;
  const startY = downEvent.clientY - viewport.deltaY * viewport.height;

  return (moveEvent: MouseEvent) => {
    viewport.deltaX = (moveEvent.clientX - startX) / viewport.width;
    viewport.deltaY = (moveEvent.clientY - startY) / viewport.height;

    // noinspection JSSuspiciousNameCombination
    if (Math.abs(viewport.deltaX) < DELTA_LIMIT && Math.abs(viewport.deltaY) < DELTA_LIMIT) {
      viewport.deltaX = 0;
      viewport.deltaY = 0;
    }
  };
}
