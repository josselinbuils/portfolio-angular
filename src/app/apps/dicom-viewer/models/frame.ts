import { DicomFrame } from 'app/apps/dicom-viewer/models/dicom-frame';

import { NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation } from '../constants';
import { fillProperties } from '../helpers/model-helpers';

export class Frame {
  /**
   * Computed
   */
  dicom: DicomFrame;
  dimensionsMm: number[];
  id: string;
  imageCenter: number[];
  imageFormat: NormalizedImageFormat;
  imageNormal: number[];

  /**
   * DICOM (filled with computed/default values if necessary)
   */
  bitsAllocated: number;
  columns: number;
  imageOrientation: number[][];
  imagePosition: number[];
  patientName: string;
  photometricInterpretation: PhotometricInterpretation;
  pixelData: Int16Array | Uint8Array;
  pixelRepresentation: PixelRepresentation;
  pixelSpacing: number[];
  rescaleIntercept?: number = 0;
  rescaleSlope?: number = 1;
  rows: number;
  sliceLocation: number;
  sopInstanceUID: string;
  windowCenter: number = 30;
  windowWidth: number = 400;

  constructor(config: object) {
    fillProperties(this, config);
  }
}
