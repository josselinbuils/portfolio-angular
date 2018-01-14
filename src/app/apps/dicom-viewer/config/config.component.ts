import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { HTTP_PREFIX } from '../../../env';
import { RENDERER } from '../constants';

import { Config } from './config';

const RENDERERS: any[] = [
  {type: RENDERER.ASM, logo: 'asmjs.png'},
  {type: RENDERER.CANVAS, logo: 'canvas.png'},
  {type: RENDERER.JS, logo: 'javascript.png'},
  {type: RENDERER.WASM, logo: 'webassembly.png'},
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
export class ConfigComponent implements OnInit {

  @Output() config = new EventEmitter<Config>();

  datasets: any[];
  renderers: any[] = RENDERERS;
  rendererType: string;
  step: string = STEP.RENDERER;

  constructor(private http: HttpClient) {
  }

  back(): void {
    this.step = STEP.RENDERER;
  }

  chooseRenderer(rendererType: string): void {
    this.rendererType = rendererType;
    this.step = STEP.DATASET;
  }

  chooseDataset(dataset: any): void {
    this.config.emit({
      dataset,
      rendererType: this.rendererType,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadDatasets();
  }

  private async loadDatasets(): Promise<void> {
    this.datasets = <string[]> await this.http.get(`${HTTP_PREFIX}/api/dicom`).toPromise();
  }
}
