import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { DicomViewerComponent } from './apps/dicom-viewer/dicom-viewer.component';
import { Mp3PlayerComponent } from './apps/mp3-player/mp3-player.component';
import { NotesComponent } from './apps/notes/notes.component';
import { RedditComponent } from './apps/reddit/reddit.component';
import { TeraviaComponent } from './apps/teravia/teravia.component';
import { TerminalComponent } from './apps/terminal/terminal.component';
import { TerminalModule } from './apps/terminal/terminal.module';
import { ContextMenuComponent } from './platform/context-menu/context-menu.component';
import { ContextMenuService } from './platform/context-menu/context-menu.service';
import { TaskBarComponent } from './platform/task-bar/task-bar.component';
import { WindowManagerService } from './platform/window/window-manager.service';
import { WindowComponent } from './platform/window/window.component';

@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent,
    DicomViewerComponent,
    Mp3PlayerComponent,
    NotesComponent,
    RedditComponent,
    TaskBarComponent,
    TeraviaComponent,
    TerminalComponent,
    WindowComponent,
    DicomViewerComponent,
  ],
  entryComponents: [
    DicomViewerComponent,
    Mp3PlayerComponent,
    NotesComponent,
    RedditComponent,
    TeraviaComponent,
    TerminalComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    TerminalModule,
  ],
  providers: [ContextMenuService, WindowManagerService],
  bootstrap: [AppComponent],
})
export class AppModule {
}
