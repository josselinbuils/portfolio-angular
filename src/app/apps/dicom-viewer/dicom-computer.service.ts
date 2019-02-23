import { Injectable } from '@angular/core';
import cloneDeep from 'lodash/cloneDeep';

import { NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation } from './constants';
import { V } from './math';
import { DicomFrame, Frame, Volume } from './models';

@Injectable()
export class DicomComputerService {
  computeFrames(dicomFrames: DicomFrame[]): Frame[] {
    const firstFrame = dicomFrames[0];
    let spacingBetweenSlices = firstFrame.spacingBetweenSlices;

    if (spacingBetweenSlices === undefined) {
      const isComputable = dicomFrames.length > 1 && firstFrame.imagePosition !== undefined &&
        dicomFrames[0].imagePosition !== undefined;

      spacingBetweenSlices = isComputable
        ? V(firstFrame.imagePosition as number[]).distance(dicomFrames[1].imagePosition as number[])
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
    const displayRatio = voxelSpacing.map(v => v / voxelSpacing[1]);
    const dimensionsMm = dimensionsVoxels.map((dim, i) => dim * voxelSpacing[i]);
    const orientedDimensionsMm = orientation.map((orient, index) => V(orient).mul(dimensionsMm[index]));
    const orientedDimensionsVoxels = orientation.map((orient, index) => V(orient).mul(dimensionsVoxels[index]));

    const getCorner = (x: number, y: number, z: number): number[] => {
      return V(firstVoxelCenter)
        .add(V(orientedDimensionsMm[0]).mul(x))
        .add(V(orientedDimensionsMm[1]).mul(y))
        .add(V(orientedDimensionsMm[2]).mul(z))
        .sub([
          V(voxelSpacing).mul(x).dot(orientation[0]),
          V(voxelSpacing).mul(y).dot(orientation[1]),
          V(voxelSpacing).mul(z).dot(orientation[2]),
        ]);
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

   const center = V(firstVoxelCenter)
      .add(V(orientedDimensionsMm[0]).mul(0.5))
      .add(V(orientedDimensionsMm[1]).mul(0.5))
      .add(V(orientedDimensionsMm[2]).mul(0.5))
      .sub(V(voxelSpacing).mul(0.5));

    return new Volume({
      center, dimensionsMm, dimensionsVoxels, displayRatio, corners, firstVoxelCenter, orientation,
      orientedDimensionsMm, orientedDimensionsVoxels, voxelSpacing,
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
    const dimensionsMm = [pixelSpacing[0] * columns, pixelSpacing[1] * rows];

    const imageCenter = V(imagePosition)
      .add(V(imageOrientation[0]).mul((columns - 1) * pixelSpacing[0] * 0.5))
      .add(V(imageOrientation[1]).mul((rows - 1) * pixelSpacing[1] * 0.5));

    const imageNormal = V(imageOrientation[0]).cross(imageOrientation[1]).normalize();

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
          break;
        default:
          throw new Error('Unknown dicom format');
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
