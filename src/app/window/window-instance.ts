import { WindowComponent } from './window.component';

export class WindowInstance {
  static iconClass: string;

  windowComponent: WindowComponent;

  getIconClass(): string {
    return (<any> this.constructor).iconClass;
  }
}
