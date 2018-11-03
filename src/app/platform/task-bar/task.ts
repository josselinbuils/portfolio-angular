import { Type } from '@angular/core';

import { WindowInstance } from '../window/window-instance';

export class Task {
  private static id = -1;

  iconClass: string;
  id: string;
  name: string;

  constructor(
    public component: Type<{}>,
    public pinned: boolean = false,
    public instance?: WindowInstance,
  ) {
    this.iconClass = (this.component as any).iconClass;
    this.id = `task_${++Task.id}`;
    this.name = (this.component as any).appName;
  }
}
