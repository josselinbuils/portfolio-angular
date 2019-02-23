import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { DicomViewerModule } from './apps/dicom-viewer';
import { Mp3PlayerComponent } from './apps/mp3-player';
import { NotesComponent } from './apps/notes';
import { RedditComponent } from './apps/reddit';
import { TeraviaComponent } from './apps/teravia';
import { TerminalModule } from './apps/terminal';
import { ContextMenuComponent, ContextMenuService } from './platform/context-menu';
import { DeviceManagerService } from './platform/device-manager.service';
import { TaskBarComponent } from './platform/task-bar';
import { WindowModule } from './platform/window';

@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent,
    Mp3PlayerComponent,
    NotesComponent,
    RedditComponent,
    TaskBarComponent,
    TeraviaComponent,
  ],
  entryComponents: [
    Mp3PlayerComponent,
    NotesComponent,
    RedditComponent,
    TeraviaComponent,
  ],
  imports: [
    BrowserModule,
    DicomViewerModule,
    FormsModule,
    HttpClientModule,
    TerminalModule,
    WindowModule,
  ],
  providers: [
    ContextMenuService,
    DeviceManagerService,
  ],
  bootstrap: [
    AppComponent,
  ],
})
export class AppModule {}
