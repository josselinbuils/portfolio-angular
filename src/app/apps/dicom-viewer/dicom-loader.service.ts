import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DEV_SERVER_URL } from '@portfolio/constants';
import untar from 'js-untar';
import cloneDeep from 'lodash/cloneDeep';

import { DatasetDescriptor } from './config/dataset-descriptor';
import { DATASETS_PATH, PhotometricInterpretation } from './constants';
import { DicomFrame } from './models';

@Injectable()
export class DicomLoaderService {

  constructor(private readonly http: HttpClient) {}

  async loadFrames(dataset: DatasetDescriptor): Promise<DicomFrame[]> {
    let frames: DicomFrame[];
    const fileBuffers: any[] = [];

    for (const file of dataset.files) {
      if (/\.tar$/.test(file)) {
        const tarBuffer = await this.getDicomFile(file);
        const tarFiles = await untar(tarBuffer);
        fileBuffers.push(...tarFiles.map(res => res.buffer));
      } else {
        fileBuffers.push(await this.getDicomFile(file));
      }
    }

    if (fileBuffers.length === 1) {
      frames = await this.loadInstance(fileBuffers[0]);
    } else if (fileBuffers.length > 0) {
      frames = [];

      for (const fileBuffer of fileBuffers) {
        frames.push(...await this.loadInstance(fileBuffer));
      }

      frames = frames.every(frame => frame.sliceLocation !== undefined)
        ? frames.sort((a, b) => (a as any).sliceLocation > (b as any).sliceLocation ? 1 : -1)
        : frames.sort((a, b) => a.sopInstanceUID > b.sopInstanceUID ? 1 : -1);

    } else {
      throw new Error('No file to load');
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

  private floatStringsToArray(parsedFile: ParsedDicomFile, tag: string,
                              slice?: number): number[] | number[][] | undefined {

    const nbValues = parsedFile.numStringValues(tag);

    if (nbValues > 0) {
      const array: number[] = [];

      for (let i = 0; i < nbValues; i++) {
        array.push(parsedFile.floatString(tag, i) as number);
      }

      if (slice !== undefined) {
        const slicedArray: number[][] = [];

        for (let j = 0; j < array.length; j += slice) {
          slicedArray.push(array.slice(j, j + slice));
        }
        return slicedArray;
      }

      return array;
    }

    return undefined;
  }

  private async getDicomFile(path: string): Promise<ArrayBuffer> {
    try {
      const url = location.hostname === 'localhost'
        ? `${DEV_SERVER_URL}${DATASETS_PATH}${path}`
        : `${DATASETS_PATH}${path}`;

      return this.http
        .get(url, { responseType: 'arraybuffer' })
        .toPromise();

    } catch (error) {
      throw new Error(`Unable to retrieve DICOM file: ${error.stack}`);
    }
  }

  private async loadInstance(dicomBuffer: ArrayBuffer): Promise<DicomFrame[]> {
    try {
      const dicomData = new Uint8Array(dicomBuffer);
      const parsedFile = this.parseDicom(dicomData);

      /**
       * DICOM fields
       */
      const instance: any = {
        bitsAllocated: parsedFile.uint16('x00280100'),
        columns: parsedFile.uint16('x00280011'),
        imagePosition: this.floatStringsToArray(parsedFile, 'x00200032'),
        imageOrientation: this.floatStringsToArray(parsedFile, 'x00200037', 3),
        patientName: parsedFile.string('x00100010'),
        photometricInterpretation: parsedFile.string('x00280004') as PhotometricInterpretation,
        pixelRepresentation: parsedFile.uint16('x00280103'),
        pixelSpacing: this.floatStringsToArray(parsedFile, 'x00280030'),
        rescaleIntercept: parsedFile.intString('x00281052'),
        rescaleSlope: parsedFile.floatString('x00281053'),
        rows: parsedFile.uint16('x00280010'),
        sliceLocation: parsedFile.floatString('x00201041'),
        sopInstanceUID: parsedFile.string('x00080018'),
        spacingBetweenSlices: parsedFile.floatString('x00180088'),
        windowCenter: parsedFile.intString('x00281050'),
        windowWidth: parsedFile.intString('x00281051'),
      };

      const numberOfFrames = parsedFile.intString('x00280008');
      const pixelDataElement = parsedFile.elements.x7fe00010;
      const pixelData: Uint8Array = (window as any).dicomParser
        .sharedCopy(dicomData, pixelDataElement.dataOffset, pixelDataElement.length);

      const frames: DicomFrame[] = [];

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
      throw new Error(`Unable to load DICOM instance: ${error.stack}`);
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
