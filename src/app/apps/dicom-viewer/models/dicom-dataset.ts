import { fillProperties } from '../helpers/model-helpers';

import { Frame } from './frame';

export class DicomDataset {
  frames: Frame[];

  constructor(config: any) {
    fillProperties(this, config);
  }

  destroy(): void {
    this.frames.forEach(frame => delete frame.pixelData);
  }
}
