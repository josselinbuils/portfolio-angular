import { Type } from '@angular/core';
import { WindowInstance } from '../window/window-instance';

export class App {
  component: Type<{}>;
  instance: WindowInstance;

  constructor(component?: Type<{}>, instance?: WindowInstance) {
    this.component = component;
    this.instance = instance;
  }

  getIcon() {
    return this.component ? (<any> this.component).iconClass : this.instance.getIconClass();
  }
}
