import { Dataset } from '../models';

import { RenderingParameters } from './rendering-parameters';

export interface Renderer {
  destroy?(): void;
  render(dataset: Dataset, renderingParameters: RenderingParameters): void;
}
