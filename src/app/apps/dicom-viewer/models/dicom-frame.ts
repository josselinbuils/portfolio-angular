import { PhotometricInterpretation, PixelRepresentation } from '../constants';
import { fillProperties } from '../helpers/model-helpers';

export class DicomFrame {
  bitsAllocated: number;
  columns: number;
  imageOrientation?: number[][];
  imagePosition?: number[];
  numberOfFrames?: number;
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
  windowCenter?: number;
  windowWidth?: number;

  constructor(config: object) {
    fillProperties(this, config);
  }
}
