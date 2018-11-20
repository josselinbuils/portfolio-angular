import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash';

import { DEV_SERVER_URL } from 'app/constants';

import { DatasetDescriptor } from './config/dataset-descriptor';
import { DATASETS_PATH, PhotometricInterpretation } from './constants';
import { DicomFrame } from './models';

@Injectable()
export class DicomLoaderService {

  constructor(private readonly http: HttpClient) {}

  async loadFrames(dataset: DatasetDescriptor): Promise<DicomFrame[]> {
    const { files } = dataset;
    let frames: DicomFrame[];

    if (files.length === 1) {
      frames = await this.loadInstance(files[0]);
    } else {
      frames = [];
      for (const file of files) {
        frames.push(...await this.loadInstance(file));
      }
      frames = frames.sort((a, b) => a.sopInstanceUID > b.sopInstanceUID ? 1 : -1);
    }

    return frames;
  }

  private findWindowingInFunctionalGroup(functionalGroup: any, index: number = 0): Windowing | undefined {
    if (functionalGroup !== undefined) {
      const voiLUT = functionalGroup.items[index].dataSet.elements.x00289132;

      if (voiLUT !== undefined) {
        const dataset = voiLUT.items[0].dataSet;
        const elements = dataset.elements;

        if (elements.x00281050 !== undefined && elements.x00281051 !== undefined) {
          return {
            windowCenter: dataset.intString('x00281050'),
            windowWidth: dataset.intString('x00281051'),
          };
        }
      }
    }
    return undefined;
  }

  private floatStringsToArray(parsedFile: ParsedDicomFile, tag: string, slice?: number): number[] | undefined {
    const nbValues = parsedFile.numStringValues(tag);

    if (nbValues > 0) {
      const array = [];

      for (let i = 0; i < nbValues; i++) {
        array.push(parsedFile.floatString(tag, i));
      }

      if (slice !== undefined) {
        const slicedArray = [];

        for (let j = 0; j < array.length; j += slice) {
          slicedArray.push(array.slice(j, j + slice));
        }
        return slicedArray;
      }

      return array;
    }

    return undefined;
  }

  private async getDicomFile(path: string): Promise<Uint8Array> {
    try {
      const url = location.hostname === 'localhost'
        ? `${DEV_SERVER_URL}${DATASETS_PATH}${path}`
        : `${DATASETS_PATH}${path}`;

      const dicomFile = await this.http
        .get(url, { responseType: 'arraybuffer' })
        .toPromise();

      return new Uint8Array(dicomFile);

    } catch (error) {
      error.message = `Unable to retrieve DICOM file: ${error.message}`;
      throw error;
    }
  }

  private async loadInstance(path: string): Promise<DicomFrame[]> {
    try {
      const dicomFile = await this.getDicomFile(path);
      const parsedFile = this.parseDicom(dicomFile);

      /**
       * DICOM fields
       */
      const bitsAllocated = parsedFile.uint16('x00280100');
      const columns = parsedFile.uint16('x00280011');
      const imagePosition = this.floatStringsToArray(parsedFile, 'x00200032');
      const imageOrientation = this.floatStringsToArray(parsedFile, 'x00200037', 3);
      const numberOfFrames = parsedFile.intString('x00280008');
      const patientName = parsedFile.string('x00100010');
      const photometricInterpretation = parsedFile.string('x00280004') as PhotometricInterpretation;
      const pixelDataElement = parsedFile.elements.x7fe00010;
      const pixelData: Uint8Array = (window as any).dicomParser
        .sharedCopy(dicomFile, pixelDataElement.dataOffset, pixelDataElement.length);
      const pixelRepresentation = parsedFile.uint16('x00280103');
      const pixelSpacing = this.floatStringsToArray(parsedFile, 'x00280030');
      const rescaleIntercept = parsedFile.intString('x00281052');
      const rescaleSlope = parsedFile.floatString('x00281053');
      const rows = parsedFile.uint16('x00280010');
      const sliceLocation = parsedFile.floatString('x00201041');
      const sopInstanceUID = parsedFile.string('x00080018');
      const spacingBetweenSlices = parsedFile.floatString('x00180088');
      const windowCenter = parsedFile.intString('x00281050');
      const windowWidth = parsedFile.intString('x00281051');

      const frames: DicomFrame[] = [];
      const instance: any = {
        bitsAllocated, columns, imagePosition, imageOrientation, numberOfFrames, patientName, photometricInterpretation,
        pixelRepresentation, pixelSpacing, rescaleIntercept, rescaleSlope, rows, sliceLocation, sopInstanceUID,
        spacingBetweenSlices, windowCenter, windowWidth,
      };

      if (Number.isInteger(numberOfFrames)) {
        const frameLength = pixelData.length / numberOfFrames;

        if (!Number.isInteger(frameLength)) {
          throw new Error(`frameLength shall be an integer: ${frameLength}`);
        }

        const sharedWindowing = this.findWindowingInFunctionalGroup(parsedFile.elements.x52009229);

        if (sharedWindowing !== undefined) {
          instance.windowCenter = sharedWindowing.windowCenter;
          instance.windowWidth = sharedWindowing.windowWidth;
        }

        for (let i = 0; i < numberOfFrames; i++) {
          const frame = cloneDeep(instance);
          const byteOffset = pixelData.byteOffset + frameLength * pixelData.BYTES_PER_ELEMENT * i;

          frame.pixelData = new Uint8Array(pixelData.buffer, byteOffset, frameLength);

          if (sharedWindowing === undefined) {
            const frameWindowing = this.findWindowingInFunctionalGroup(parsedFile.elements.x52009230, i);

            if (frameWindowing !== undefined) {
              frame.windowCenter = frameWindowing.windowCenter;
              frame.windowWidth = frameWindowing.windowWidth;
            }
          }

          frames.push(new DicomFrame(frame));
        }
      } else {
        instance.pixelData = pixelData;
        frames.push(new DicomFrame(instance));
      }

      return frames;

    } catch (error) {
      error.message = `Unable to load DICOM instance: ${error.message || error}`;
      throw error;
    }
  }

  private parseDicom(data: Uint8Array): ParsedDicomFile {
    try {
      return (window as any).dicomParser.parseDicom(data);
    } catch (error) {
      throw new Error(`Unable to parse DICOM: ${error.message || error}`);
    }
  }
}

interface ParsedDicomFile {
  fileName: string;

  elements: { [tag: string]: { dataOffset: number; length: number } };

  attributeTag(tag: string): string;

  floatString(tag: string, index?: number): number;

  intString(tag: string, index?: number): number;

  numStringValues(tag: string): number;

  string(tag: string): string;

  uint16(tag: string): number;
}

interface Windowing {
  windowCenter: number;
  windowWidth: number;
}
