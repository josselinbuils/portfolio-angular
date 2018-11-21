import { Camera } from '../models';

export interface RenderingParameters {
  camera: Camera;
  deltaX: number;
  deltaY: number;
  windowWidth: number;
  windowCenter: number;
  zoom: number;
}
