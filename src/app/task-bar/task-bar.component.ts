import { Component } from '@angular/core';
import { WindowManagerService } from '../window-manager.service';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-task-bar',
  templateUrl: './task-bar.component.html',
  styleUrls: ['./task-bar.component.css']
})
export class TaskBarComponent {
  windowInstances: WindowInstance[] = [];

  constructor(private windowManagerService: WindowManagerService) {
    windowManagerService.getSubject().subscribe(windowInstances => this.windowInstances = windowInstances);
  }

  select(id: number) {
    if (this.windowManagerService.isWindowSelected(id)) {
      this.windowManagerService.unselectWindow(id);
    } else {
      this.windowManagerService.selectWindow(id);
    }
  }
}
