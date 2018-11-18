import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { DicomLoaderService } from 'app/apps/dicom-viewer/dicom-loader.service';
import { ToolbarComponent } from 'app/apps/dicom-viewer/toolbar/toolbar.component';
import { WindowModule } from 'app/platform/window/window.module';

import { ConfigComponent } from './config/config.component';
import { DicomViewerComponent } from './dicom-viewer.component';

@NgModule({
  declarations: [
    ConfigComponent,
    DicomViewerComponent,
    ToolbarComponent,
  ],
  entryComponents: [
    ConfigComponent,
    DicomViewerComponent,
    ToolbarComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    WindowModule,
  ],
  exports: [
    DicomViewerComponent,
  ],
  providers: [
    DicomLoaderService,
  ],
})
export class DicomViewerModule {}
