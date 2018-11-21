import { fillProperties } from '../helpers/model-helpers';

import { Frame } from './frame';
import { Volume } from './volume';

export class Dataset {
  frames: Frame[];
  is3D: boolean;
  volume?: Volume;

  constructor(config: any) {
    fillProperties(this, config);
    this.is3D = this.volume !== undefined;
  }

  destroy(): void {
    this.frames.forEach(frame => delete frame.pixelData);
  }
}
