import { Component, OnInit, Type } from '@angular/core';
import { DicomViewerComponent } from '@portfolio/apps/dicom-viewer';
import { Mp3PlayerComponent } from '@portfolio/apps/mp3-player';
import { NotesComponent } from '@portfolio/apps/notes';
import { RedditComponent } from '@portfolio/apps/reddit';
import { TeraviaComponent } from '@portfolio/apps/teravia';
import { WindowManagerService } from '@portfolio/platform/window';

import { Executor } from '../executor';

// TODO find a way to retrieve registered apps automatically
const apps: { [name: string]: Type<{}> } = {
  dicomviewer: DicomViewerComponent,
  mp3player: Mp3PlayerComponent,
  notes: NotesComponent,
  reddit: RedditComponent,
  teravia: TeraviaComponent,
};

@Component({
  selector: 'app-open',
  templateUrl: './open.component.html',
  styleUrls: ['./open.component.scss'],
})
export class OpenComponent implements OnInit, Executor {
  args!: string[];
  error?: string;

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
