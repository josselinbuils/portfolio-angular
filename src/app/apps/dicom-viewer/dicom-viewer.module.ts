import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { WindowModule } from 'app/platform/window/window.module';

import { ConfigComponent } from './config/config.component';
import { DicomComputerService } from './dicom-computer.service';
import { DicomLoaderService } from './dicom-loader.service';
import { DicomViewerComponent } from './dicom-viewer.component';
import { ToolbarComponent } from './toolbar/toolbar.component';

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
    DicomComputerService,
    DicomLoaderService,
  ],
})
export class DicomViewerModule {}
