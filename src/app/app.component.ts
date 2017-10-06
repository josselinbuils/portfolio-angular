import { Component, ViewContainerRef } from '@angular/core';
import { WindowManagerService } from './window-manager.service';
import { TerminalComponent } from './terminal/terminal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private viewContainerRef: ViewContainerRef, private windowManagerService: WindowManagerService) {
    windowManagerService.setViewContainerRef(viewContainerRef);
    windowManagerService.openWindow(TerminalComponent);
  }
}
