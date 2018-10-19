import { Component, Renderer2 } from '@angular/core';

import { MOUSE_BUTTON } from '../../constants';
import { DOMUtils } from '../dom-utils';

import { ContextMenuDescriptor } from './context-menu-descriptor';
import { ContextMenuItem } from './context-menu-item';
import { ContextMenuService } from './context-menu.service';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
})
export class ContextMenuComponent {

  descriptor: ContextMenuDescriptor;
  show = false;
  style: any = {};

  private destroyMouseDownListener: () => void;

  constructor(contextMenuService: ContextMenuService,
              private readonly renderer: Renderer2) {

    contextMenuService.showSubject.subscribe((descriptor: ContextMenuDescriptor) => {
      descriptor.event.preventDefault();

      this.descriptor = descriptor;

      if (descriptor.position !== undefined) {
        this.style['top.px'] = descriptor.position.top;
        this.style['left.px'] = descriptor.position.left;
      } else {
        this.style['top.px'] = descriptor.event.clientY;
        this.style['left.px'] = descriptor.event.clientX;
      }

      if (descriptor.style !== undefined) {
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

    const isContextMenuChild: boolean = DOMUtils.closest(<HTMLElement> event.target, '.context-menu') !== undefined;

    if (!isContextMenuChild) {
      this.hideMenu();
    }
  }

  private showMenu(): void {
    this.show = true;
    this.destroyMouseDownListener = this.renderer.listen('window', 'mousedown', this.mouseDownListener.bind(this));
  }
}
