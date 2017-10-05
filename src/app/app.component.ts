import { Component, ViewContainerRef } from '@angular/core';
import { WindowManagerService } from './window-manager.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private viewContainerRef: ViewContainerRef, private windowManagerService: WindowManagerService) {
    windowManagerService.setViewContainerRef(viewContainerRef);
  }
}
