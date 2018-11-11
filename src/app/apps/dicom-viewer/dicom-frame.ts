import { NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation } from './constants';

export interface DicomFrame {
  imageFormat: NormalizedImageFormat;

  /**
   * DICOM
   */
  bitsAllocated: number;
  height: number;
  sopInstanceUID: string;
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
