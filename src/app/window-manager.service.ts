import { ComponentFactoryResolver, ComponentRef, Injectable, Type, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs/Rx';
import { WindowInstance } from './window/window-instance';

@Injectable()
export class WindowManagerService {
  private components: ComponentRef<{}>[] = [];
  private id = -1;
  private subject: BehaviorSubject<WindowInstance[]> = new BehaviorSubject<WindowInstance[]>(<WindowInstance[]> []);
  private viewContainerRef: ViewContainerRef;

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
  }

  getSubject(): BehaviorSubject<WindowInstance[]> {
    return this.subject;
  }

  closeWindow(id: number) {
    const index = this.components.findIndex(componentRef => (<WindowInstance> componentRef.instance).id === id);

    if (index !== -1) {
      this.components[index].destroy();
      this.components.splice(index, 1);
      this.publishWindowInstances();
    } else {
      throw Error(`No window found with id ${id}`);
    }
  }

  isWindowSelected(id: number): boolean {
    return this.getWindowInstance(id).active;
  }

  openWindow(component: Type<{}>) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.viewContainerRef.createComponent(componentFactory);
    const id = ++this.id;
    (<WindowInstance> componentRef.instance).id = id;
    this.components.push(componentRef);
    this.selectWindow(id);
    this.publishWindowInstances();
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
    return (<WindowInstance> this.components[id].instance);
  }

  private getWindowInstances(): WindowInstance[] {
    return this.components.map(componentRef => (<WindowInstance> componentRef.instance));
  }

  private publishWindowInstances(): void {
    this.subject.next(this.getWindowInstances());
  }
}
