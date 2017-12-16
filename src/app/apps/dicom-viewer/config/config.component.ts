import { Component, EventEmitter, Output } from '@angular/core';

import { RENDERER } from '../constants';

import { Config } from './config';

const DATASETS: string[] = [
  'CT-MONO2-16-ankle', 'CT-MONO2-16-brain', 'CT-MONO2-16-ort', 'TG18-BR-2k-01', 'TG18-CH-2k-01', 'TG18-MM-2k-01',
  'TG18-QC-2k-01',
];

const RENDERERS: any[] = [
  {type: RENDERER.ASM, logo: 'asmjs.png'},
  {type: RENDERER.JS, logo: 'javascript.png'},
  // {type: RENDERER.WASM, logo: 'webassembly.png'},
  {type: RENDERER.WEBGL, logo: 'webgl.png'},
];

enum STEP {
  DATASET = 'dataset',
  RENDERER = 'renderer',
}

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
})
export class ConfigComponent {

  @Output() config = new EventEmitter<Config>();

  datasets: string[] = DATASETS;
  renderers: any[] = RENDERERS;
  rendererType: string;
  step: string = STEP.RENDERER;

  constructor() {
  }

  back(): void {
    this.step = STEP.RENDERER;
  }

  chooseRenderer(rendererType: string): void {
    this.rendererType = rendererType;
    this.step = STEP.DATASET;
  }

  chooseDataset(dataset: string): void {
    this.config.emit({
      dataset,
      rendererType: this.rendererType,
    });
  }
}
