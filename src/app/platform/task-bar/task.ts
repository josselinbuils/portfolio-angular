import { Type } from '@angular/core';

import { WindowInstance } from '../window/window-instance';

export class Task {
  private static id = -1;

  component: Type<{}>;
  iconClass: string;
  id: string;
  instance: WindowInstance;
  name: string;
  pinned: boolean;

  constructor(component: Type<{}>, pinned: boolean, instance?: WindowInstance) {
    this.component = component;
    this.iconClass = (<any> component).iconClass;
    this.id = 'task_' + (++Task.id);
    this.instance = instance;
    this.name = (<any> component).appName;
    this.pinned = pinned;
  }
}
