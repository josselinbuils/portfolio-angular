import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { HTTP_PREFIX } from 'app/env';

import { RendererType } from '../constants';

import { Config } from './config';
import { DatasetDescriptor } from './dataset-descriptor';

enum Step {
  Dataset = 'dataset',
  Renderer = 'renderer',
}

@Component({
  selector: 'app-dicom-viewer-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
})
export class ConfigComponent implements OnInit {

  @Output() config = new EventEmitter<Config>();

  datasets: DatasetDescriptor[];
  renderers = [
    { type: RendererType.JavaScript, logo: 'javascript.png' },
    { type: RendererType.WebAssembly, logo: 'webassembly.png' },
    { type: RendererType.WebGL, logo: 'webgl.png' },
  ];
  rendererType: string;
  step = Step.Renderer;

  constructor(private readonly http: HttpClient) {}

  back(): void {
    this.step = Step.Renderer;
  }

  chooseRenderer(rendererType: string): void {
    this.rendererType = rendererType;
    this.step = Step.Dataset;
  }

  chooseDataset(dataset: DatasetDescriptor): void {
    this.config.emit({
      dataset,
      rendererType: this.rendererType,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadDatasets();
  }

  private async loadDatasets(): Promise<void> {
    this.datasets = await this.http.get(`${HTTP_PREFIX}/api/dicom`).toPromise() as DatasetDescriptor[];
  }
}
