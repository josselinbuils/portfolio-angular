import { Frame } from '../models';

export interface RenderingParameters {
  deltaX: number;
  deltaY: number;
  frame: Frame;
  windowWidth: number;
  windowCenter: number;
  zoom: number;
}
