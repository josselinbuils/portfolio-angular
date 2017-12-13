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

  constructor(config: any) {
    this.deltaX = config.deltaX || 0;
    this.deltaY = config.deltaY || 0;
    this.height = config.height;
    this.image = config.image;
    this.width = config.width;
    this.windowLevel = config.windowLevel;
    this.windowWidth = config.windowWidth;
    this.zoom = config.zoom || 1;
  }
}
