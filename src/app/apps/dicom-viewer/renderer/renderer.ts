import { RenderingParameters } from './rendering-parameters';

export interface Renderer {
  destroy?(): void;
  render(renderingParameters: RenderingParameters): void;
}
