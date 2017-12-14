import { Viewport } from '../models/viewport';

export interface Renderer {
  destroy(): void;
  render(viewport: Viewport): void;
  resize(viewport: Viewport): void;
}
