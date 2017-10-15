import { ComponentFactoryResolver, ComponentRef, Injectable, Type, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs/Rx';
import { WindowInstance } from './window/window-instance';

@Injectable()
export class WindowManagerService {
  private components: { id: number, ref: ComponentRef<{}> }[] = [];
  private id = -1;
  private subject: BehaviorSubject<WindowInstance[]> = new BehaviorSubject<WindowInstance[]>(<WindowInstance[]> []);
  private viewContainerRef: ViewContainerRef;

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
  }

  getSubject(): BehaviorSubject<WindowInstance[]> {
    return this.subject;
  }

  closeWindow(id: number) {
    const index = this.components.findIndex(component => (<WindowInstance> component.ref.instance).id === id);
    this.components[index].ref.destroy();
    this.components.splice(index, 1);
    this.publishWindowInstances();
  }

  hideWindow(id: number) {
    this.getWindowInstance(id).visible = false;
    this.unselectWindow(id);
  }

  isWindowSelected(id: number): boolean {
    return this.getWindowInstance(id).active;
  }

  isWindowVisible(id: number): boolean {
    return this.getWindowInstance(id).visible;
  }

  openWindow(component: Type<{}>) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.viewContainerRef.createComponent(componentFactory);
    const id = ++this.id;
    (<WindowInstance> componentRef.instance).id = id;
    this.components.push({
      id: id,
      ref: componentRef
    });
    this.selectWindow(id);
    this.publishWindowInstances();
  }

  showWindow(id: number) {
    this.getWindowInstance(id).visible = true;
    this.selectWindow(id);
  }

  selectWindow(id: number) {
    let i = 0;

    this.getWindowInstances()
      .filter(windowInstance => windowInstance.id !== id)
      .sort((a, b) => (a.zIndex < b.zIndex) ? -1 : 1)
      .forEach((windowInstance, index) => {
        windowInstance.active = false;
        windowInstance.zIndex = ++i;
      });

    const activeWindow = this.getWindowInstance(id);
    activeWindow.active = true;
    activeWindow.zIndex = ++i;
  }

  setViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
  }

  unselectAllWindows() {
    this.getWindowInstances().forEach(window => window.active = false);
  }

  unselectWindow(id: number) {
    this.getWindowInstance(id).active = false;
  }

  private getWindowInstance(id: number): WindowInstance {
    return <WindowInstance> this.components.find(component => (<WindowInstance> component.ref.instance).id === id).ref.instance;
  }

  private getWindowInstances(): WindowInstance[] {
    return this.components.map(component => (<WindowInstance> component.ref.instance));
  }

  private publishWindowInstances(): void {
    this.subject.next(this.getWindowInstances());
  }
}
