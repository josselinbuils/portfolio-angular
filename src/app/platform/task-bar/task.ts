import { Type } from '@angular/core';

import { WindowInstance } from '../window/window-instance';

export class Task {
  private static id = -1;

  iconClass: string;
  id: string;
  name: string;

  constructor(
    public component: Type<{}>,
    public pinned: boolean,
    public instance?: WindowInstance,
  ) {
    this.iconClass = (<any> this.component).iconClass;
    this.id = `task_${++Task.id}`;
    this.name = (<any> this.component).appName;
  }
}
