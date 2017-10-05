import { ComponentFactory, ComponentFactoryResolver, Injectable, Type, ViewContainerRef } from '@angular/core';

@Injectable()
export class WindowManagerService {
  private viewContainerRef: ViewContainerRef;

  public openWindow(component: Type<{}>) {
    const componentFactory: ComponentFactory<{}> = this.componentFactoryResolver.resolveComponentFactory(component);
    this.viewContainerRef.createComponent(componentFactory);
  }

  public setViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
  }

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
  }
}
