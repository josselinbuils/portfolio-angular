import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash';

import { math } from './helpers/maths-helpers';

import { NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation } from './constants';
import { DicomFrame, Frame, Volume } from './models';

@Injectable()
export class DicomComputerService {
  computeFrames(dicomFrames: DicomFrame[]): Frame[] {
    const firstFrame = dicomFrames[0];
    let spacingBetweenSlices = firstFrame.spacingBetweenSlices;

    if (spacingBetweenSlices === undefined) {
      const haveFramesImagePosition = dicomFrames.slice(0, 3).every(frame => frame.imagePosition !== undefined);

      spacingBetweenSlices = dicomFrames.length > 1 && haveFramesImagePosition
        ? Math.abs(math.distance(firstFrame.imagePosition, dicomFrames[1].imagePosition) as number)
        : 1;
    }

    return dicomFrames.map((frame, frameIndex) => {
      const dicom = frame;
      const id = `${frame.sopInstanceUID}-${frameIndex}`;
      const { imageFormat, pixelData } = this.normalizePixelData(frame);
      const {
        dimensionsMm, imageCenter, imageNormal, imageOrientation, imagePosition, pixelSpacing, sliceLocation,
      } = this.computeFrameGeometry(frame, frameIndex);

      // Removes original pixel data to save space
      delete frame.pixelData;

      return new Frame({
        ...cloneDeep(frame), dicom, dimensionsMm, id, imageCenter, imageFormat, imageNormal, imageOrientation,
        imagePosition, pixelData, pixelSpacing, sliceLocation, spacingBetweenSlices,
      });
    });
  }

  computeSharedProperties(frames: Frame[]): SharedProperties {
    const { pixelSpacing, spacingBetweenSlices } = frames[0];
    const voxelSpacing = [...pixelSpacing, spacingBetweenSlices];
    return { voxelSpacing };
  }

  computeVolume(frames: Frame[], sharedProperties: SharedProperties): Volume | undefined {
    const isVolume = frames.length > 30 && frames.every(frame => {
      return frame.imageFormat === NormalizedImageFormat.Int16 &&
        frame.dicom.imageOrientation !== undefined &&
        frame.dicom.imagePosition !== undefined &&
        frame.dicom.pixelSpacing !== undefined;
    });

    if (!isVolume) {
      return undefined;
    }

    const { voxelSpacing } = sharedProperties;
    const { columns, imageOrientation, imageNormal, rows } = frames[0];

    const dimensionsVoxels = [columns, rows, frames.length];
    const firstVoxelCenter = frames[0].imagePosition;
    const orientation = [...imageOrientation, imageNormal];

    const pixelData: Int16Array[] = [];

    frames.forEach(frame => {
      pixelData.push(frame.pixelData as Int16Array);
    });

    const displayRatio = voxelSpacing.map(v => v / voxelSpacing[1]);
    const dimensionsMm = math.dotMultiply(dimensionsVoxels, voxelSpacing);
    const orientedDimensionsMm = orientation.map((orient, index) => math.multiply(orient, dimensionsMm[index]));
    const orientedDimensionsVoxels = orientation.map((orient, index) => math.multiply(orient, dimensionsVoxels[index]));

    const getCorner = (x: number, y: number, z: number): number[] => {
      return math.chain(firstVoxelCenter)
        .add(math.multiply(orientedDimensionsMm[0], x))
        .add(math.multiply(orientedDimensionsMm[1], y))
        .add(math.multiply(orientedDimensionsMm[2], z))
        .subtract(math.dotMultiply(voxelSpacing, [x, y, z]))
        .done();
    };

    const corners = {
      x0y0z0: getCorner(0, 0, 0),
      x1y0z0: getCorner(1, 0, 0),
      x1y1z0: getCorner(1, 1, 0),
      x0y1z0: getCorner(0, 1, 0),
      x0y0z1: getCorner(0, 0, 1),
      x1y0z1: getCorner(1, 0, 1),
      x1y1z1: getCorner(1, 1, 1),
      x0y1z1: getCorner(0, 1, 1),
    };

    return new Volume({
      dimensionsMm, dimensionsVoxels, displayRatio, corners, firstVoxelCenter, orientation, orientedDimensionsMm,
      orientedDimensionsVoxels, pixelData, voxelSpacing,
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

    const imageNormal = math.chain(imageOrientation[0]).cross(imageOrientation[1]).normalize().done();

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
          typedPixelData = new Int8Array(rawPixelData.buffer, rawPixelData.byteOffset, rawPixelData.length);
          break;
        case DicomImageFormat.Int16:
          typedPixelData = new Int16Array(rawPixelData.buffer, rawPixelData.byteOffset, rawPixelData.length / 2);
          break;
        case DicomImageFormat.UInt8:
          typedPixelData = rawPixelData;
          break;
        case DicomImageFormat.UInt16:
          typedPixelData = new Uint16Array(rawPixelData.buffer, rawPixelData.byteOffset, rawPixelData.length / 2);
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

interface SharedProperties {
  voxelSpacing: number[];
}
