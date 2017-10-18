import { Component } from '@angular/core';
import { NotesComponent } from '../notes/notes.component';
import { RedditComponent } from '../reddit/reddit.component';
import { Task } from './task';
import { TeraviaComponent } from '../teravia/teravia.component';
import { TerminalComponent } from '../terminal/terminal.component';
import { WindowInstance } from '../window/window-instance';
import { WindowManagerService } from '../window-manager.service';

@Component({
  selector: 'app-task-bar',
  templateUrl: './task-bar.component.html',
  styleUrls: ['./task-bar.component.css']
})
export class TaskBarComponent {

  tasks: Task[] = [
    new Task(TerminalComponent), new Task(TeraviaComponent), new Task(RedditComponent), new Task(NotesComponent)
  ];

  constructor(private windowManagerService: WindowManagerService) {
    windowManagerService.getSubject().subscribe(windowInstances => {
      this.removeOutdatedTasks(windowInstances);
      this.addNewTasks(windowInstances);
      this.removeDuplicatedTasks();
    });
  }

  addNewTasks(windowInstances: WindowInstance[]): void {
    windowInstances.forEach(windowInstance => {
      const task = this.tasks.find(a => windowInstance instanceof a.component);

      if (task && (!task.instance || task.instance === windowInstance)) {
        if (!task.instance) {
          task.instance = windowInstance;
        }
      } else {
        this.tasks.push(new Task(null, windowInstance));
      }
    });
  }

  // Tasks can be duplicated if several instances of the same component are opened and one of the first ones is stopped
  removeDuplicatedTasks(): void {
    for (let i = this.tasks.length - 1; i > 0; i--) {
      for (let j = 0; j < i; j++) {
        const instance = this.tasks[j].instance;

        if (instance && instance === this.tasks[i].instance) {
          this.tasks.splice(i, 1);
        }
      }
    }
  }

  removeOutdatedTasks(windowInstances: WindowInstance[]): void {
    this.tasks.forEach((app, index) => {
      if (app.instance && windowInstances.indexOf(app.instance) === -1) {
        if (app.component) {
          app.instance = null;
        } else {
          this.tasks.splice(index, 1);
        }
      }
    });
  }

  run(task: Task) {
    if (task.instance) {
      const id = task.instance.windowComponent.id;

      if (this.windowManagerService.isWindowVisible(id)) {
        if (this.windowManagerService.isWindowSelected(id)) {
          this.windowManagerService.hideWindow(id);
        } else {
          this.windowManagerService.selectWindow(id);
        }
      } else {
        this.windowManagerService.showWindow(id);
      }
    } else {
      this.windowManagerService.openWindow(task.component);
    }
  }
}
