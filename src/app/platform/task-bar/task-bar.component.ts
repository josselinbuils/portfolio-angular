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
    });
  }

  addNewTasks(windowInstances: WindowInstance[]): void {
    windowInstances
      // Keep only new instances
      .filter(windowInstance => this.tasks.find(task => task.instance === windowInstance) === undefined)
      .forEach(windowInstance => {
        // Try to find a task without instance for this component (possible only if pinned)
        const pinnedTask = this.tasks.find(
          task => task.component === windowInstance.constructor && task.instance === undefined,
        );
        let newTask: Task | undefined;

        if (pinnedTask !== undefined) {
          pinnedTask.instance = windowInstance;
          newTask = pinnedTask;
        } else {
          newTask = new Task(windowInstance.constructor as Type<{}>, false, windowInstance);
          this.tasks.push(newTask);
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
          }, 0);
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

  removeOutdatedTasks(windowInstances: WindowInstance[]): void {
    this.tasks.forEach((task, index) => {
      if (task.instance !== undefined && !windowInstances.includes(task.instance)) {
        if (task.pinned) {
          const relatedTasks = this.tasks.filter(t => t !== task && t.component === task.component);

          if (relatedTasks.length === 0) {
            // There was only 1 instance for this component, deletes the instance
            delete task.instance;
          } else {
            // There were multiple instances of the component, removes the task and makes the next task of the component
            // pinned
            this.tasks.splice(index, 1);
            relatedTasks[0].pinned = true;
          }
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
