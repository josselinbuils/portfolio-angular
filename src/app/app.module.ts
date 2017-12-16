import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { DicomViewerModule } from './apps/dicom-viewer/dicom-viewer.module';
import { Mp3PlayerComponent } from './apps/mp3-player/mp3-player.component';
import { NotesComponent } from './apps/notes/notes.component';
import { RedditComponent } from './apps/reddit/reddit.component';
import { TeraviaComponent } from './apps/teravia/teravia.component';
import { TerminalModule } from './apps/terminal/terminal.module';
import { ContextMenuComponent } from './platform/context-menu/context-menu.component';
import { ContextMenuService } from './platform/context-menu/context-menu.service';
import { TaskBarComponent } from './platform/task-bar/task-bar.component';
import { WindowModule } from './platform/window/window.module';

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
  ],
  bootstrap: [
    AppComponent,
  ],
})
export class AppModule {
}
