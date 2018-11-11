import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { DatasetDescriptor } from 'app/apps/dicom-viewer/config/dataset-descriptor';
import {
  DATASETS_PATH, DicomImageFormat, NormalizedImageFormat, PhotometricInterpretation, PixelRepresentation,
} from 'app/apps/dicom-viewer/constants';
import { DicomDataset } from 'app/apps/dicom-viewer/dicom-dataset';
import { DicomInstance } from 'app/apps/dicom-viewer/dicom-instance';

@Injectable()
export class DicomLoaderService {

  constructor(private readonly http: HttpClient) {}

  async loadDataset(dataset: DatasetDescriptor): Promise<DicomDataset> {
    const { files } = dataset;
    let instances: DicomInstance[] = [];

    for (const file of files) {
      instances.push(await this.loadInstance(file));
    }

    instances = instances.sort((a, b) => a.sopInstanceUID > b.sopInstanceUID ? 1 : -1);

    return { instances };
  }

  private async getDicomFile(path: string): Promise<Uint8Array> {
    try {
      const dicomFile = await this.http
        .get(`${DATASETS_PATH}${path}`, { responseType: 'arraybuffer' })
        .toPromise();

      return new Uint8Array(dicomFile);

    } catch (error) {
      throw new Error(`Unable to retrieve DICOM file: ${error.message}`);
    }
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

  private getNormalizedPixelData(dicomFile: Uint8Array, parsedFile: ParsedDicomFile,
                                 dicomImageFormat: DicomImageFormat): NormalizedPixelData {

    const pixelDataElement = parsedFile.elements.x7fe00010;

    let pixelData: Uint8Array | Int16Array = (window as any).dicomParser
      .sharedCopy(dicomFile, pixelDataElement.dataOffset, pixelDataElement.length) as Uint8Array;
    let imageFormat: NormalizedImageFormat;

    console.log(dicomImageFormat);

    if (dicomImageFormat === DicomImageFormat.RGB) {
      imageFormat = NormalizedImageFormat.RGB;
    } else {
      const arrayType: any = {
        int8: Int8Array,
        int16: Int16Array,
        uint8: Uint8Array,
        uint16: Uint16Array,
      };

      // Casts pixel data to the right type
      const typedPixelData = new arrayType[dicomImageFormat](pixelData.buffer, pixelData.byteOffset);

      // Normalizes pixel data
      pixelData = typedPixelData instanceof Int16Array ? typedPixelData : Int16Array.from(Array.from(typedPixelData));
      imageFormat = NormalizedImageFormat.Int16;
    }

    return { imageFormat, pixelData };
  }

  private async loadInstance(path: string): Promise<DicomInstance> {
    try {
      const dicomFile = await this.getDicomFile(path);
      const parsedFile = this.parseDicom(dicomFile);

      const bitsAllocated = parsedFile.uint16('x00280100');
      const height = parsedFile.uint16('x00280010');
      const patientName = parsedFile.string('x00100010');
      const photometricInterpretation = parsedFile.string('x00280004') as PhotometricInterpretation;
      const pixelRepresentation = parsedFile.uint16('x00280103');
      const rescaleIntercept = typeof parsedFile.intString('x00281052') === 'number'
        ? parsedFile.intString('x00281052')
        : 0;
      const rescaleSlope = typeof parsedFile.floatString('x00281053') === 'number'
        ? parsedFile.floatString('x00281053')
        : 1;
      const sopInstanceUID = parsedFile.string('x00080018');
      const width = parsedFile.uint16('x00280011');
      const windowCenter = typeof parsedFile.intString('x00281050') === 'number'
        ? parsedFile.intString('x00281050')
        : 30;
      const windowWidth = typeof  parsedFile.intString('x00281051') === 'number'
        ? parsedFile.intString('x00281051')
        : 400;

      const dicomImageFormat = this.getDicomImageFormat(bitsAllocated, photometricInterpretation, pixelRepresentation);
      const { imageFormat, pixelData } = this.getNormalizedPixelData(dicomFile, parsedFile, dicomImageFormat);

      return {
        bitsAllocated, height, imageFormat, patientName, photometricInterpretation, pixelData,
        pixelRepresentation, rescaleIntercept, rescaleSlope, sopInstanceUID, width, windowCenter, windowWidth,
      };

    } catch (error) {
      throw new Error(`Unable to load DICOM instance: ${error.message || error}`);
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

interface NormalizedPixelData {
  imageFormat: NormalizedImageFormat;
  pixelData: Int16Array | Uint8Array;
}

interface ParsedDicomFile {
  fileName: string;

  elements: { [tag: string]: { dataOffset: number; length: number } };

  floatString(tag: string): number;

  intString(tag: string): number;

  string(tag: string): string;

  uint16(tag: string): number;
}
