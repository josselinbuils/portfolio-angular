import { Viewport, Volume } from '../models';
import { convert } from '../utils/coordinates';
import { math } from '../utils/math';

const STYLE_FRONT = 'rgba(255, 255, 255, .7)';
const STYLE_BEHIND = 'rgba(255, 255, 255, .2)';

export function displayCube(viewport: Viewport, canvas: HTMLCanvasElement, render: () => void): void {

  const volume = viewport.dataset.volume as Volume;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;

  const lines = [
    ['x0y0z0', 'x1y0z0'],
    ['x1y0z0', 'x1y1z0'],
    ['x1y1z0', 'x0y1z0'],
    ['x0y1z0', 'x0y0z0'],
    ['x0y0z1', 'x1y0z1'],
    ['x1y0z1', 'x1y1z1'],
    ['x1y1z1', 'x0y1z1'],
    ['x0y1z1', 'x0y0z1'],
    ['x0y0z0', 'x0y0z1'],
    ['x1y0z0', 'x1y0z1'],
    ['x1y1z0', 'x1y1z1'],
    ['x0y1z0', 'x0y1z1'],
  ];

  const cornersDisplay: typeof volume.corners = { ...volume.corners };

  for (const [name, corner] of Object.entries(volume.corners)) {
    cornersDisplay[name] = convert(corner, viewport.dataset, viewport, viewport.dataset);
  }

  const front: any[] = [];
  const cross: any[] = [];

  context.fillStyle = 'black';
  context.fillRect(0, 0, viewport.width, viewport.height);

  for (const [keyA, keyB] of lines) {
    const aLPS = volume.corners[keyA];
    const bLPS = volume.corners[keyB];
    const aDisplay = cornersDisplay[keyA];
    const bDisplay = cornersDisplay[keyB];
    const info = getLineInfo(aLPS, bLPS, viewport);

    if (info.crossesViewport) {
      const pointBehindViewportDisplay = convert(
        info.pointBehindViewport as number[], viewport.dataset, viewport, viewport.dataset,
      );
      const pointInFrontOfViewportDisplay = convert(
        info.pointInFrontOfViewport as number[], viewport.dataset, viewport, viewport.dataset,
      );
      const pointInViewportDisplay = convert(
        info.pointInViewport as number[], viewport.dataset, viewport, viewport.dataset,
      );

      cross.push({
        pointInFrontOfViewportDisplay,
        pointInViewportDisplay,
        pointInViewport: info.pointInViewport,
        pointInFrontOfViewport: info.pointInFrontOfViewport,
      });

      context.beginPath();
      context.moveTo(pointBehindViewportDisplay[0], pointBehindViewportDisplay[1]);
      context.lineTo(pointInViewportDisplay[0], pointInViewportDisplay[1]);
      context.strokeStyle = STYLE_BEHIND;
      context.stroke();

    } else if (info.isInFrontOfViewport) {
      front.push({ aDisplay, bDisplay });
    } else if (info.isBehindViewport) {
      context.beginPath();
      context.moveTo(aDisplay[0], aDisplay[1]);
      context.lineTo(bDisplay[0], bDisplay[1]);
      context.strokeStyle = STYLE_BEHIND;
      context.stroke();
    }
  }

  render();

  for (const { pointInFrontOfViewportDisplay, pointInViewportDisplay } of cross) {
    context.beginPath();
    context.moveTo(pointInViewportDisplay[0], pointInViewportDisplay[1]);
    context.lineTo(pointInFrontOfViewportDisplay[0], pointInFrontOfViewportDisplay[1]);
    context.strokeStyle = STYLE_FRONT;
    context.stroke();
  }

  // for (const { pointInViewportDisplay, pointInViewport, pointInFrontOfViewport } of cross) {
  //   const crosses = cross
  //     .filter(c => c.pointInViewport !== pointInViewport)
  //     .sort((a, b) => {
  //       return math.distance(pointInViewport, a.pointInViewport) < math.distance(pointInViewport, b.pointInViewport)
  //         ? -1
  //         : 1;
  //     });
  //   const toLink = crosses.find(c => {
  //     const line = math.subtract(pointInViewport, pointInFrontOfViewport);
  //     const distLine = math.dot(c.pointInViewport, line as number[]);
  //     return distLine > 0 && distLine / (math.distance(pointInViewport, c.pointInViewport) as number) > 0.3;
  //   });
  //
  //   if (toLink !== undefined) {
  //     context.beginPath();
  //     context.moveTo(toLink.pointInViewportDisplay[0], toLink.pointInViewportDisplay[1]);
  //     context.lineTo(pointInViewportDisplay[0], pointInViewportDisplay[1]);
  //     context.strokeStyle = STYLE_FRONT;
  //     context.stroke();
  //   }
  // }

  for (const { aDisplay, bDisplay } of front) {
    context.beginPath();
    context.moveTo(aDisplay[0], aDisplay[1]);
    context.lineTo(bDisplay[0], bDisplay[1]);
    context.strokeStyle = STYLE_FRONT;
    context.stroke();
  }

  for (const { pointInViewportDisplay } of cross) {
    context.beginPath();
    context.arc(pointInViewportDisplay[0], pointInViewportDisplay[1], 3, 0, Math.PI * 2);
    context.fillStyle = 'red';
    context.fill();
  }

  context.beginPath();
  context.arc(cornersDisplay.x0y0z0[0], cornersDisplay.x0y0z0[1], 2, 0, Math.PI * 2);
  context.fillStyle = STYLE_FRONT;
  context.fill();
}

function getLineInfo(a: number[], b: number[], viewport: Viewport): LineInfo {
  const viewportOrigin = viewport.getWorldOrigin();
  const viewportBasis = viewport.getWorldBasis();
  const viewportToADistance = math.chain(a).subtract(viewportOrigin).dot(viewportBasis[2]).done();
  const viewportToBDistance = math.chain(b).subtract(viewportOrigin).dot(viewportBasis[2]).done();
  const crossesViewport = Math.sign(viewportToADistance) !== Math.sign(viewportToBDistance);
  const isInFrontOfViewport = !crossesViewport && viewportToADistance < 0;
  const isBehindViewport = !crossesViewport && viewportToADistance > 0;
  const lineInfo: LineInfo = { crossesViewport, isInFrontOfViewport, isBehindViewport };

  if (crossesViewport) {
    const plane = [
      viewportOrigin,
      math.add(viewportOrigin, viewportBasis[0]),
      math.add(viewportOrigin, viewportBasis[1]),
    ] as number[][];

    lineInfo.pointBehindViewport = viewportToADistance > 0 ? a : b;
    lineInfo.pointInFrontOfViewport = viewportToADistance < 0 ? a : b;
    lineInfo.pointInViewport = getLinePlaneIntersection([a, b], plane);
  }

  return lineInfo;
}

function getLinePlaneIntersection(line: number[][], plane: number[][]): number[] {
  const [[x1, y1, z1], [x2, y2, z2], [x3, y3, z3]] = plane;
  const [[x4, y4, z4], [x5, y5, z5]] = line;

  const m1 = [
    [1, 1, 1, 1],
    [x1, x2, x3, x4],
    [y1, y2, y3, y4],
    [z1, z2, z3, z4],
  ];

  const m2 = [
    [1, 1, 1, 0],
    [x1, x2, x3, x5 - x4],
    [y1, y2, y3, y5 - y4],
    [z1, z2, z3, z5 - z4],
  ];

  const t = -math.det(m1) / math.det(m2);
  const x = x4 + (x5 - x4) * t;
  const y = y4 + (y5 - y4) * t;
  const z = z4 + (z5 - z4) * t;

  return [x, y, z];
}

interface LineInfo {
  crossesViewport: boolean;
  isBehindViewport: boolean;
  isInFrontOfViewport: boolean;
  pointBehindViewport?: number[];
  pointInFrontOfViewport?: number[];
  pointInViewport?: number[];
}
