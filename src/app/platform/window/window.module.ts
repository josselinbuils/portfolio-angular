import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { WindowManagerService } from './window-manager.service';
import { WindowComponent } from './window.component';

@NgModule({
  declarations: [
    WindowComponent,
  ],
  entryComponents: [],
  imports: [
    BrowserModule,
    HttpClientModule,
  ],
  exports: [
    WindowComponent,
  ],
  providers: [
    WindowManagerService,
  ],
})
export class WindowModule {}
