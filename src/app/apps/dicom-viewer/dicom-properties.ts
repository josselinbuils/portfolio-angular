import { ImageFormat, PhotometricInterpretation, PixelRepresentation } from './constants';

export interface DicomProperties {
  bitsAllocated: number;
  height: number;
  imageFormat: ImageFormat;
  patientName: string;
  photometricInterpretation: PhotometricInterpretation;
  pixelDataBuffer: ArrayBuffer;
  pixelRepresentation: PixelRepresentation;
  rescaleIntercept: number;
  rescaleSlope: number;
  width: number;
  windowLevel: number;
  windowWidth: number;
}
