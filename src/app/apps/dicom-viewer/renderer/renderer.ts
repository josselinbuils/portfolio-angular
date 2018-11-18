import { Viewport } from '../models';

export interface Renderer {
  destroy?(): void;
  init?(): Promise<void>;
  render(viewport: Viewport): void;
  resize?(viewport: Viewport): void;
}
