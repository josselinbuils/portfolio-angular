import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DEV_SERVER_URL } from '@portfolio/constants';
import { HTTP_PREFIX } from '@portfolio/env';

import { PREVIEWS_PATH, RendererType } from '../constants';

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

  datasets?: DatasetDescriptor[];
  previewsPath = location.hostname === 'localhost'
    ? `${DEV_SERVER_URL}${PREVIEWS_PATH}`
    : `${PREVIEWS_PATH}`;
  renderers = [
    { type: RendererType.JavaScript, logo: 'javascript.png' },
    { type: RendererType.WebGL, logo: 'webgl.png' },
  ];
  rendererType?: string;
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
      rendererType: this.rendererType as RendererType,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadDatasets();
  }

  private async loadDatasets(): Promise<void> {
    this.datasets = await this.http.get(`${HTTP_PREFIX}/api/dicom`).toPromise() as DatasetDescriptor[];
  }
}
