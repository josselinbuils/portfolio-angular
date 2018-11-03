import { Component, OnInit, Type } from '@angular/core';

import { DicomViewerComponent } from 'app/apps/dicom-viewer/dicom-viewer.component';
import { WindowManagerService } from 'app/platform/window/window-manager.service';

import { Executor } from '../executor';

const apps: { [name: string]: Type<{}> } = {
  dicomviewer: DicomViewerComponent,
};

@Component({
  selector: 'app-open',
  templateUrl: './open.component.html',
  styleUrls: ['./open.component.scss'],
})
export class OpenComponent implements OnInit, Executor {
  args: string[];
  error: string;

  constructor(private readonly windowManagerService: WindowManagerService) {}

  ngOnInit(): void {
    const appName = this.args[0];

    if (apps[appName] !== undefined) {
      this.windowManagerService.openWindow(apps[appName]);
    } else {
      this.error = `-open: ${appName}: unknown application`;
    }
  }
}
