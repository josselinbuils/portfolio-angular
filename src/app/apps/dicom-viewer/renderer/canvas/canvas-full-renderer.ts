import { Renderer } from '../renderer';
import { Viewport } from '../../models/viewport';

export class CanvasFullRenderer implements Renderer {

  private context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  render(viewport: Viewport) {
    const {height, imageFormat, pixelData, rescaleIntercept, rescaleSlope, width} = viewport.image;

    const zoom = viewport.height / height * viewport.zoom;
    const imageWidth = Math.round(width * zoom);
    const imageHeight = Math.round(height * zoom);

    const y0 = Math.round(((viewport.height - imageHeight) / 2 + viewport.deltaY * viewport.height));
    const y1 = y0 + imageHeight;

    const x0 = Math.round(((viewport.width - imageWidth) / 2 + viewport.deltaX * viewport.width));
    const x1 = x0 + imageWidth;

    const displayY0 = Math.max(y0, 0);
    const displayY1 = Math.min(y1, viewport.height - 1);

    const displayX0 = Math.max(x0, 0);
    const displayX1 = Math.min(x1, viewport.width - 1);

    const displayWidth = Math.max(displayX1 - displayX0, 0);
    const displayHeight = Math.max(displayY1 - displayY0, 0);

    const length = viewport.width * viewport.height * 4;

    if (length > 0) {
      const imageData = new Uint8ClampedArray(length);

      for (let y = displayY0; y < displayY1; y++) {
        for (let x = displayX0; x < displayX1; x++) {
          const dataIndex = (y * viewport.width + x) * 4;
          const pixelDataIndex = Math.floor((y - y0) / zoom) * width + Math.floor((x - x0) / zoom);
          let intensity = pixelData[pixelDataIndex] * rescaleSlope + rescaleIntercept;
          intensity = ((intensity - viewport.windowLevel - 0.5) / viewport.windowWidth + 0.5) * 256;
          intensity = Math.min(Math.max(intensity, 0), 255);
          imageData[dataIndex] = intensity;
          imageData[dataIndex + 1] = intensity;
          imageData[dataIndex + 2] = intensity;
          imageData[dataIndex + 3] = 255;
        }
      }

      this.context.putImageData(new ImageData(imageData, viewport.width, viewport.height), 0, 0);
    }
  }

  resize(viewport: Viewport) {

  }
}
