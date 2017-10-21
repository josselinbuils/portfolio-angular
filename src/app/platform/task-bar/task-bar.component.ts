import { Component } from '@angular/core';

import { NotesComponent } from '../../apps/notes/notes.component';
import { RedditComponent } from '../../apps/reddit/reddit.component';
import { Task } from './task';
import { TeraviaComponent } from '../../apps/teravia/teravia.component';
import { TerminalComponent } from '../../apps/terminal/terminal.component';
import { WindowInstance } from '../window/window-instance';
import { WindowManagerService } from '../window-manager.service';

@Component({
  selector: 'app-task-bar',
  templateUrl: './task-bar.component.html',
  styleUrls: ['./task-bar.component.css']
})
export class TaskBarComponent {

  tasks: Task[] = [
    new Task(TerminalComponent, true), new Task(TeraviaComponent, true), new Task(RedditComponent, true),
    new Task(NotesComponent, true)
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
      const refTask = this.tasks.find(task => windowInstance instanceof task.component);

      if (!refTask) {
        throw Error('Unknown task');
      }

      if (!refTask.instance) {
        refTask.instance = windowInstance;
      } else if (refTask.instance !== windowInstance) {
        this.tasks.push(new Task(refTask.component, false, windowInstance));
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
    this.tasks.forEach((task, index) => {
      if (task.instance && windowInstances.indexOf(task.instance) === -1) {
        if (task.pinned) {
          task.instance = null;
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
