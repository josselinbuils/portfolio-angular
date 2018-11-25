import { ComponentFactoryResolver, Injectable, Type, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { WindowInstance } from './window-instance';
import { WindowComponent } from './window.component';

@Injectable()
export class WindowManagerService {
  windowInstancesSubject = new BehaviorSubject<WindowInstance[]>([]);

  private readonly windows: WindowComponent[] = [];
  private id = -1;
  private viewContainerRef?: ViewContainerRef;

  constructor(private readonly componentFactoryResolver: ComponentFactoryResolver) {}

  closeWindow(id: number): void {
    const index = this.windows.findIndex(w => w.id === id);
    const window = this.windows[index];
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
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = (this.viewContainerRef as ViewContainerRef).createComponent(componentFactory);

    const window = (componentRef.instance as any).windowComponent as WindowComponent;
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
    let i = 0;

    this.windows
      .filter(window => window.id !== id)
      .sort((a, b) => (a.zIndex < b.zIndex) ? -1 : 1)
      .forEach(window => {
        window.active = false;
        window.zIndex = ++i;
      });

    const activeWindow = this.getWindowComponent(id);
    activeWindow.active = true;
    activeWindow.zIndex = ++i;
  }

  setViewContainerRef(viewContainerRef: ViewContainerRef): void {
    this.viewContainerRef = viewContainerRef;
  }

  unselectAllWindows(): void {
    this.windows.forEach(window => window.active = false);
  }

  unselectWindow(id: number): void {
    this.getWindowComponent(id).active = false;
  }

  private getWindowComponent(id: number): WindowComponent {
    const windowComponent = this.windows.find(window => window.id === id);

    if (windowComponent === undefined) {
      throw new Error(`Unable to find a window component with id ${id}`);
    }
    return windowComponent;
  }

  private publishWindowInstances(): void {
    const instances = this.windows.map(window => window.parentRef.instance as WindowInstance);
    this.windowInstancesSubject.next(instances);
  }
}
