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
    this.getWindowInstances().forEach(windowInstance => windowInstance.active = false);
    this.getWindowInstance(id).active = true;
  }

  setViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
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
