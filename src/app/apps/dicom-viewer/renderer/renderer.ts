import { Viewport } from '../models/viewport';

export interface Renderer {
  render: (viewport: Viewport) => void;
  resize: (viewport: Viewport) => void;
}
