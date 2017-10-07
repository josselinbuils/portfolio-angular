import { Component } from '@angular/core';
import { App } from './app';
import { WindowManagerService } from '../window-manager.service';
import { TeraviaComponent } from '../teravia/teravia.component';
import { TerminalComponent } from '../terminal/terminal.component';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-task-bar',
  templateUrl: './task-bar.component.html',
  styleUrls: ['./task-bar.component.css']
})
export class TaskBarComponent {

  apps: App[] = [new App(TerminalComponent), new App(TeraviaComponent)];

  constructor(private windowManagerService: WindowManagerService) {
    windowManagerService.getSubject().subscribe(windowInstances => {
      this.removeOutdatedTasks(windowInstances);
      this.addNewTasks(windowInstances);
      this.removeDuplicatedTasks();
    });
  }

  addNewTasks(windowInstances: WindowInstance[]): void {
    windowInstances.forEach(windowInstance => {
      const app = this.apps.find(a => windowInstance instanceof a.component);

      if (app && (!app.instance || app.instance === windowInstance)) {
        if (!app.instance) {
          app.instance = windowInstance;
        }
      } else {
        this.apps.push(new App(null, windowInstance));
      }
    });
  }

  // Tasks can be duplicated if several instances of the same component are opened and one of the first ones is stopped
  removeDuplicatedTasks(): void {
    for (let i = this.apps.length - 1; i > 0; i--) {
      for (let j = 0; j < i; j++) {
        const instance = this.apps[j].instance;

        if (instance && instance === this.apps[i].instance) {
          this.apps.splice(i, 1);
        }
      }
    }
  }

  removeOutdatedTasks(windowInstances: WindowInstance[]): void {
    this.apps.forEach((app, index) => {
      if (app.instance && windowInstances.indexOf(app.instance) === -1) {
        if (app.component) {
          app.instance = null;
        } else {
          this.apps.splice(index, 1);
        }
      }
    });
  }

  run(app: App) {
    if (app.instance) {
      const id = app.instance.id;

      if (this.windowManagerService.isWindowSelected(id)) {
        this.windowManagerService.unselectWindow(id);
      } else {
        this.windowManagerService.selectWindow(id);
      }
    } else {
      this.windowManagerService.openWindow(app.component);
    }
  }
}
