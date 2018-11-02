import { Component, OnInit, Type } from '@angular/core';

import { WindowManagerService } from '../../../../platform/window/window-manager.service';
import { DicomViewerComponent } from '../../../dicom-viewer/dicom-viewer.component';
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
    const appName: string = this.args[0];

    if (apps[appName] !== undefined) {
      this.windowManagerService.openWindow(apps[appName]);
    } else {
      this.error = `-open: ${appName}: unknown application`;
    }
  }
}
