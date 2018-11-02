import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { HTTP_PREFIX } from '../../../env';
import { RendererType } from '../constants';

import { Config } from './config';

const RENDERERS: { type: RendererType; logo: string }[] = [
  {type: RendererType.JavaScript, logo: 'javascript.png'},
  {type: RendererType.WebAssembly, logo: 'webassembly.png'},
  {type: RendererType.WebGL, logo: 'webgl.png'},
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

  constructor(private readonly http: HttpClient) {}

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
