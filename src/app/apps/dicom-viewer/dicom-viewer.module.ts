import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { WindowModule } from '../../platform/window/window.module';

import { ConfigComponent } from './config/config.component';
import { DicomViewerComponent } from './dicom-viewer.component';
@NgModule({
  declarations: [
    ConfigComponent,
    DicomViewerComponent,
  ],
  entryComponents: [
    ConfigComponent,
    DicomViewerComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    WindowModule,
  ],
  exports: [
    DicomViewerComponent,
  ],
})
export class DicomViewerModule {
}
