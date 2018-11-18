import { NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation } from '../constants';

export interface DicomFrame {
  id: string;
  imageFormat: NormalizedImageFormat;

  /**
   * DICOM
   */
  bitsAllocated: number;
  rows: number;
  imageOrientation: number[][] | undefined;
  imagePosition: number[] | undefined;
  patientName: string;
  photometricInterpretation: PhotometricInterpretation;
  pixelData: Int16Array | Uint8Array;
  pixelRepresentation: PixelRepresentation;
  pixelSpacing: number[] | undefined;
  rescaleIntercept: number;
  rescaleSlope: number;
  sliceLocation: number | undefined;
  columns: number;
  windowCenter: number;
  windowWidth: number;
}
