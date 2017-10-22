import { Component, Renderer2 } from '@angular/core';

import { MOUSE_BUTTON } from '../../constants';
import { ContextMenuItem } from './context-menu-item';
import { ContextMenuDescriptor } from './context-menu-descriptor';
import { ContextMenuService } from './context-menu.service';
import { DOMUtils } from '../dom-utils';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent {

  descriptor: ContextMenuDescriptor;
  show = false;
  style: any = {};

  private destroyMouseDownListener: () => void;

  constructor(private contextMenuService: ContextMenuService, private renderer: Renderer2) {
    contextMenuService.showSubject.subscribe(descriptor => {
      this.descriptor = descriptor;

      if (descriptor.position) {
        this.style['top.px'] = descriptor.position.top;
        this.style['left.px'] = descriptor.position.left;
      } else {
        this.style['top.px'] = descriptor.event.clientY;
        this.style['left.px'] = descriptor.event.clientX;
      }

      if (descriptor.style) {
        Object.assign(this.style, descriptor.style);
      }

      this.showMenu();
    });
  }

  click(item: ContextMenuItem): void {
    if (typeof item.click === 'function') {
      this.hideMenu();
      item.click();
    }
  }

  private hideMenu(): void {
    this.destroyMouseDownListener();
    this.show = false;
  }

  private mouseDownListener(event: MouseEvent): void {

    if ([MOUSE_BUTTON.LEFT, MOUSE_BUTTON.RIGHT].indexOf(event.button) === -1) {
      return;
    }

    const isContextMenuChild = !!DOMUtils.getParent(<HTMLElement> event.target, '.context-menu');

    if (!isContextMenuChild) {
      this.hideMenu();
    }
  }

  private showMenu(): void {
    this.show = true;
    this.destroyMouseDownListener = this.renderer.listen('window', 'mousedown', this.mouseDownListener.bind(this));
  }
}
