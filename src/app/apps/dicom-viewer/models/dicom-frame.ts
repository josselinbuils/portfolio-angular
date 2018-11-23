import { PhotometricInterpretation, PixelRepresentation } from '../constants';

import { Model } from './model';

export class DicomFrame extends Model {
  bitsAllocated: number;
  columns: number;
  imageOrientation?: number[][];
  imagePosition?: number[];
  patientName: string;
  photometricInterpretation: PhotometricInterpretation;
  pixelData: Uint8Array;
  pixelRepresentation: PixelRepresentation;
  pixelSpacing?: number[];
  rescaleIntercept?: number;
  rescaleSlope?: number;
  rows: number;
  sliceLocation?: number;
  sopInstanceUID: string;
  spacingBetweenSlices: number;
  windowCenter?: number;
  windowWidth?: number;

  constructor(config: object) {
    super();
    super.fillProperties(this, config);
  }
}
