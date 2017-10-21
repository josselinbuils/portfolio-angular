import { ComponentFactoryResolver, Injectable, Type, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs/Rx';
import { WindowInstance } from './window-instance';
import { WindowComponent } from './window.component';

@Injectable()
export class WindowManagerService {
  windowInstancesSubject: BehaviorSubject<WindowInstance[]> = new BehaviorSubject<WindowInstance[]>(<WindowInstance[]> []);

  private windowComponents: WindowComponent[] = [];
  private id = -1;
  private viewContainerRef: ViewContainerRef;

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
  }

  closeWindow(id: number) {
    const index = this.windowComponents.findIndex(windowComponent => windowComponent.id === id);
    this.windowComponents[index].parentRef.destroy();
    this.windowComponents.splice(index, 1);
    this.publishWindowInstances();
  }

  hideWindow(id: number) {
    this.getWindowComponent(id).hide();
    this.unselectWindow(id);
  }

  isWindowSelected(id: number): boolean {
    return this.getWindowComponent(id).active;
  }

  isWindowVisible(id: number): boolean {
    return this.getWindowComponent(id).visible;
  }

  openWindow(component: Type<{}>) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.viewContainerRef.createComponent(componentFactory);

    const windowComponent = (<WindowInstance> componentRef.instance).windowComponent;
    windowComponent.id = ++this.id;
    windowComponent.parentRef = componentRef;

    this.windowComponents.push(windowComponent);
    this.selectWindow(windowComponent.id);
    this.publishWindowInstances();
  }

  showWindow(id: number) {
    this.getWindowComponent(id).show();
    this.selectWindow(id);
  }

  selectWindow(id: number) {
    let i = 0;

    this.windowComponents
      .filter(windowComponent => windowComponent.id !== id)
      .sort((a, b) => (a.zIndex < b.zIndex) ? -1 : 1)
      .forEach((windowComponent, index) => {
        windowComponent.active = false;
        windowComponent.zIndex = ++i;
      });

    const activeWindow = this.getWindowComponent(id);
    activeWindow.active = true;
    activeWindow.zIndex = ++i;
  }

  setViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
  }

  unselectAllWindows() {
    this.windowComponents.forEach(window => window.active = false);
  }

  unselectWindow(id: number) {
    this.getWindowComponent(id).active = false;
  }

  private getWindowComponent(id: number): WindowComponent {
    return this.windowComponents.find(windowComponent => windowComponent.id === id);
  }

  private publishWindowInstances(): void {
    this.windowInstancesSubject.next(this.windowComponents.map(windowComponent => <WindowInstance> windowComponent.parentRef.instance));
  }
}
