import {
  ComponentFactory, ComponentFactoryResolver, ComponentRef, Injectable, Type, ViewContainerRef
} from '@angular/core';
import { WindowInstance } from './window/window-instance';

@Injectable()
export class WindowManagerService {
  private id: number;
  private viewContainerRef: ViewContainerRef;
  private components: any;

  public closeWindow(id: number) {
    this.components[id].destroy();
    delete this.components[id];
  }

  public openWindow(component: Type<{}>) {
    const componentFactory: ComponentFactory<{}> = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef: ComponentRef<{}> = this.viewContainerRef.createComponent(componentFactory);
    this.id++;
    (<WindowInstance> componentRef.instance).windowId = this.id;
    this.components[this.id] = componentRef;
  }

  public setViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
  }

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
    this.id = 0;
    this.components = {};
  }
}
