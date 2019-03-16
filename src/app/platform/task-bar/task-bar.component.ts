import { Component, Type, ViewContainerRef } from '@angular/core';
import { DicomViewerComponent } from '@portfolio/apps/dicom-viewer';
import { Mp3PlayerComponent } from '@portfolio/apps/mp3-player';
import { NotesComponent } from '@portfolio/apps/notes';
import { RedditComponent } from '@portfolio/apps/reddit';
import { TeraviaComponent } from '@portfolio/apps/teravia';
import { TerminalComponent } from '@portfolio/apps/terminal';

import { ContextMenuItem, ContextMenuService } from '../context-menu';
import { DOMUtils } from '../dom-utils';
import { WindowInstance, WindowManagerService } from '../window';

import { Task } from './task';

@Component({
  selector: 'app-task-bar',
  templateUrl: './task-bar.component.html',
  styleUrls: ['./task-bar.component.scss'],
})
export class TaskBarComponent {

  tasks: Task[] = [
    new Task(TerminalComponent, true), new Task(DicomViewerComponent, true), new Task(Mp3PlayerComponent, true),
    new Task(TeraviaComponent, true), new Task(RedditComponent, true), new Task(NotesComponent, true),
  ];

  constructor(private readonly contextMenuService: ContextMenuService,
              private readonly viewContainerRef: ViewContainerRef,
              private readonly windowManagerService: WindowManagerService) {

    windowManagerService.windowInstancesSubject.subscribe(windowInstances => {
      this.removeOutdatedTasks(windowInstances);
      this.addNewTasks(windowInstances);
      this.removeDuplicatedTasks();
    });
  }

  addNewTasks(windowInstances: WindowInstance[]): void {
    windowInstances.forEach(windowInstance => {
      let refTask = this.tasks.find(task => windowInstance instanceof task.component);

      if (refTask === undefined) {
        refTask = new Task(windowInstance.constructor as Type<{}>);
        this.tasks.push(refTask);
      }

      let newTask: Task | undefined;

      if (refTask.instance === undefined) {
        refTask.instance = windowInstance;
        newTask = refTask;
      } else if (refTask.instance !== windowInstance) {
        this.tasks.push(new Task(refTask.component, false, windowInstance));
        newTask = this.tasks[this.tasks.length - 1];
      }

      if (newTask !== undefined) {
        setTimeout(() => {
          const taskElement = document.getElementById((newTask as Task).id);

          if (taskElement === null) {
            throw new Error('Task element not found');
          }

          const taskClientRect = taskElement.getBoundingClientRect();
          const topPosition = Math.round(taskClientRect.top + taskClientRect.height / 3);
          windowInstance.windowComponent.setMinimizedTopPosition(topPosition);
        });
      }
    });
  }

  openContextMenu(task: Task, event: MouseEvent): void {
    const taskBarElement = this.viewContainerRef.element.nativeElement;
    const taskElement = DOMUtils.closest(event.target as HTMLElement, '.task');

    if (taskElement === undefined) {
      throw new Error('Task element not found');
    }

    const left = taskBarElement.getBoundingClientRect().right;
    const top = taskElement.getBoundingClientRect().top;

    const items: ContextMenuItem[] = [{
      iconClass: task.iconClass,
      title: task.name,
      click: () => this.windowManagerService.openWindow(task.component),
    }];

    if (task.instance !== undefined) {
      items.push({
        iconClass: 'fas fa-times',
        title: 'Close',
        click: () => {
          const instance = (task as Task).instance as WindowInstance;
          this.windowManagerService.closeWindow(instance.windowComponent.id);
        },
      });
    }

    this.contextMenuService.show({
      event,
      items,
      position: {
        left,
        top,
      },
      style: {
        'border-top-left-radius': 0,
        'border-bottom-left-radius': 0,
        'min-height': `${taskElement.clientHeight}px`,
      },
    });
  }

  // Tasks can be duplicated if several instances of the same component are opened and one of the first ones is stopped
  removeDuplicatedTasks(): void {
    for (let i = this.tasks.length - 1; i > 0; i--) {
      for (let j = 0; j < i; j++) {
        const instance = this.tasks[j].instance;

        if (instance !== undefined && instance === this.tasks[i].instance) {
          this.tasks.splice(i, 1);
        }
      }
    }
  }

  removeOutdatedTasks(windowInstances: WindowInstance[]): void {
    this.tasks.forEach((task, index) => {
      if (task.instance !== undefined && windowInstances.indexOf(task.instance) === -1) {
        if (task.pinned) {
          delete task.instance;
        } else {
          this.tasks.splice(index, 1);
        }
      }
    });
  }

  run(task: Task): void {
    if (task.instance !== undefined) {
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
