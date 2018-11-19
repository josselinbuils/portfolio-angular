export const DATASETS_PATH = '/assets/dicom/datasets/';

export enum MouseTool {
  Paging,
  Pan,
  Windowing,
  Zoom,
}

export enum NormalizedImageFormat {
  Int16 = 'int16',
  RGB = 'rgb',
}

export enum PhotometricInterpretation {
  Monochrome1 = 'MONOCHROME1',
  Monochrome2 = 'MONOCHROME2',
  RGB = 'RGB',
}

export enum PixelRepresentation {
  Signed = 1,
  Unsigned = 0,
}

export enum RendererType {
  JavaScript = 'JavaScript',
  WebAssembly = 'WebAssembly',
  WebGL = 'WebGL',
}
