import { WindowComponent } from './window.component';

export abstract class WindowInstance {
  static appName: string;
  static iconClass: string;
  windowComponent!: WindowComponent;
}
