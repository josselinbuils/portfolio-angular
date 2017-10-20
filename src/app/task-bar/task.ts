import { Type } from '@angular/core';

import { WindowInstance } from '../window/window-instance';

export class Task {
  component: Type<{}>;
  iconClass: string;
  instance: WindowInstance;
  pinned: boolean;

  constructor(component: Type<{}>, pinned: boolean, instance?: WindowInstance) {
    this.component = component;
    this.iconClass = (<any> component).iconClass;
    this.instance = instance;
    this.pinned = pinned;
  }
}
