import {
  ComponentFactory, ComponentFactoryResolver, ComponentRef, Injectable, Type,
  ViewContainerRef,
} from '@angular/core';
import { BehaviorSubject } from 'rxjs/Rx';

import { WindowInstance } from './window-instance';
import { WindowComponent } from './window.component';

@Injectable()
export class WindowManagerService {
  windowInstancesSubject: BehaviorSubject<WindowInstance[]> = new BehaviorSubject<WindowInstance[]>(<WindowInstance[]> []);

  private windows: WindowComponent[] = [];
  private id = -1;
  private viewContainerRef: ViewContainerRef;

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
  }

  closeWindow(id: number): void {
    const index: number = this.windows.findIndex((w: WindowComponent) => w.id === id);
    const window: WindowComponent = this.windows[index];
    this.windows.splice(index, 1);
    window.parentRef.destroy();
    this.publishWindowInstances();
  }

  hideWindow(id: number): void {
    this.getWindowComponent(id).hide();
    this.unselectWindow(id);
  }

  isWindowSelected(id: number): boolean {
    return this.getWindowComponent(id).active;
  }

  isWindowVisible(id: number): boolean {
    return this.getWindowComponent(id).visible;
  }

  openWindow(component: Type<{}>): void {
    const componentFactory: ComponentFactory<{}> = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef: ComponentRef<{}> = this.viewContainerRef.createComponent(componentFactory);

    const window: WindowComponent = (<WindowInstance> componentRef.instance).windowComponent;
    window.id = ++this.id;
    window.parentRef = componentRef;

    this.windows.push(window);
    this.selectWindow(window.id);
    this.publishWindowInstances();
  }

  showWindow(id: number): void {
    this.getWindowComponent(id).show();
    this.selectWindow(id);
  }

  selectWindow(id: number): void {
    let i: number = 0;

    this.windows
      .filter((window: WindowComponent) => window.id !== id)
      .sort((a: WindowComponent, b: WindowComponent) => (a.zIndex < b.zIndex) ? -1 : 1)
      .forEach((window: WindowComponent, index: number) => {
        window.active = false;
        window.zIndex = ++i;
      });

    const activeWindow: WindowComponent = this.getWindowComponent(id);
    activeWindow.active = true;
    activeWindow.zIndex = ++i;
  }

  setViewContainerRef(viewContainerRef: ViewContainerRef): void {
    this.viewContainerRef = viewContainerRef;
  }

  unselectAllWindows(): void {
    this.windows.forEach((window: WindowComponent) => window.active = false);
  }

  unselectWindow(id: number): void {
    this.getWindowComponent(id).active = false;
  }

  private getWindowComponent(id: number): WindowComponent {
    return this.windows.find((window: WindowComponent) => window.id === id);
  }

  private publishWindowInstances(): void {
    const instances: WindowInstance[] = this.windows.map((window: WindowComponent) => {
      return <WindowInstance> window.parentRef.instance;
    });
    this.windowInstancesSubject.next(instances);
  }
}
