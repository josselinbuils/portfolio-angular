import { Image } from './image';

export class Viewport {

  deltaX: number;
  deltaY: number;
  height: number;
  image: Image;
  width: number;
  windowLevel: number;
  windowWidth: number;
  zoom: number;

  constructor(config) {
    this.deltaX = config.deltaX || 0;
    this.deltaY = config.deltaY || 0;
    this.height = config.height || null;
    this.image = config.image || null;
    this.width = config.width || null;
    this.windowLevel = config.windowLevel || null;
    this.windowWidth = config.windowWidth || null;
    this.zoom = config.zoom || 1;
  }
}
