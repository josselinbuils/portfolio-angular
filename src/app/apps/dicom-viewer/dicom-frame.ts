import { NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation } from './constants';

export interface DicomFrame {
  id: string;
  imageFormat: NormalizedImageFormat;

  /**
   * DICOM
   */
  bitsAllocated: number;
  height: number;
  patientName: string;
  photometricInterpretation: PhotometricInterpretation;
  pixelData: Int16Array | Uint8Array;
  pixelRepresentation: PixelRepresentation;
  rescaleIntercept: number;
  rescaleSlope: number;
  width: number;
  windowCenter: number;
  windowWidth: number;
}
