import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash';
import * as math from 'mathjs';

import { NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation } from './constants';
import { DicomFrame, Frame } from './models';

@Injectable()
export class DicomComputerService {
  computeFrames(dicomFrames: DicomFrame[]): Frame[] {
    return dicomFrames.map((frame, frameIndex) => {
      const { numberOfFrames, sopInstanceUID } = frame;

      const dicom = frame;
      const id = this.getFrameId(frame, frameIndex);
      const { imageFormat, pixelData } = this.normalizePixelData(frame);
      const {
        dimensionsMm, imageCenter, imageNormal, imageOrientation, imagePosition, pixelSpacing, sliceLocation,
      } = this.computeFrameGeometry(frame, frameIndex);

      // Removes original pixel data to save space
      delete frame.pixelData;

      return new Frame({
        ...cloneDeep(frame), dicom, dimensionsMm, imageCenter, imageFormat, imageNormal, imageOrientation,
        imagePosition, pixelData, pixelSpacing, sliceLocation,
      });
    });
  }

  private computeFrameGeometry(frame: DicomFrame, frameIndex: number): FrameGeometry {
    let { imageOrientation, imagePosition, pixelSpacing, sliceLocation } = frame;

    if (imageOrientation === undefined) {
      imageOrientation = [[1, 0, 0], [0, 1, 0]];
    }
    if (sliceLocation === undefined) {
      sliceLocation = frameIndex + 0.5;
    }
    if (imagePosition === undefined) {
      imagePosition = [0.5, 0.5, sliceLocation];
    }
    if (pixelSpacing === undefined) {
      pixelSpacing = [1, 1];
    }

    const { columns, rows } = frame;
    // TODO use slice thickness
    const dimensionsMm = math.dotMultiply(pixelSpacing, [columns, rows]) as number[];

    const imageCenter = math.chain(imagePosition)
      .add(math.multiply(imageOrientation[0], (columns - 1) * pixelSpacing[0] * 0.5))
      .add(math.multiply(imageOrientation[1], (rows - 1) * pixelSpacing[1] * 0.5))
      .done();

    const imageNormal = math.cross(imageOrientation[0], imageOrientation[1]) as number[];

    return { dimensionsMm, imageCenter, imageNormal, imageOrientation, imagePosition, pixelSpacing, sliceLocation };
  }

  private getDicomImageFormat(bitsAllocated: number, photometricInterpretation: PhotometricInterpretation,
                              pixelRepresentation: PixelRepresentation): DicomImageFormat {
    let format: string;

    if (photometricInterpretation === PhotometricInterpretation.RGB) {
      format = 'rgb';
    } else if ((photometricInterpretation as string).includes('MONOCHROME')) {
      const isSigned = pixelRepresentation === PixelRepresentation.Signed;
      format = `${isSigned ? '' : 'u'}int${bitsAllocated <= 8 ? '8' : '16'}`;
    } else {
      throw new Error('Unsupported photometric interpretation');
    }

    return format as DicomImageFormat;
  }

  private getFrameId(frame: DicomFrame, frameIndex: number): string {
    const { numberOfFrames, sopInstanceUID } = frame;
    return numberOfFrames > 0 ? `${sopInstanceUID}.${frameIndex}` : sopInstanceUID;
  }

  private normalizePixelData(frame: DicomFrame): NormalizedPixelData {
    const { bitsAllocated, photometricInterpretation, pixelRepresentation } = frame;
    const dicomImageFormat = this.getDicomImageFormat(bitsAllocated, photometricInterpretation, pixelRepresentation);
    const rawPixelData = frame.pixelData;
    let imageFormat: NormalizedImageFormat;
    let pixelData: Int16Array | Uint8Array;

    if (dicomImageFormat === DicomImageFormat.RGB) {
      imageFormat = NormalizedImageFormat.RGB;
      pixelData = rawPixelData;
    } else {
      let typedPixelData: ArrayBufferView;

      // Casts pixel data to the right type
      switch (dicomImageFormat) {
        case DicomImageFormat.Int8:
          typedPixelData = new Int8Array(rawPixelData.buffer, rawPixelData.byteOffset);
          break;
        case DicomImageFormat.Int16:
          typedPixelData = new Int16Array(rawPixelData.buffer, rawPixelData.byteOffset);
          break;
        case DicomImageFormat.UInt8:
          typedPixelData = rawPixelData;
          break;
        case DicomImageFormat.UInt16:
          typedPixelData = new Uint16Array(rawPixelData.buffer, rawPixelData.byteOffset);
      }

      // Normalizes pixel data
      imageFormat = NormalizedImageFormat.Int16;
      pixelData = typedPixelData instanceof Int16Array ? typedPixelData : new Int16Array(typedPixelData as any);
    }

    return { imageFormat, pixelData };
  }
}

enum DicomImageFormat {
  Int8 = 'int8',
  Int16 = 'int16',
  RGB = 'rgb',
  UInt8 = 'uint8',
  UInt16 = 'uint16',
}

interface FrameGeometry {
  dimensionsMm: number[];
  imageCenter: number[];
  imageNormal: number[];
  imageOrientation: number[][];
  imagePosition: number[];
  pixelSpacing: number[];
  sliceLocation: number;
}

interface NormalizedPixelData {
  imageFormat: NormalizedImageFormat;
  pixelData: Int16Array | Uint8Array;
}
