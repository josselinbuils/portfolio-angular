import { Component, HostListener } from '@angular/core';

import { MOUSE_BUTTON } from '../../constants';
import { ContextMenuService } from './context-menu.service';
import { ContextMenuItem } from './context-menu-item';
import { DOMUtils } from '../dom-utils';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent {
  items: any[];
  show = false;
  style: any = {};

  constructor(private contextMenuService: ContextMenuService) {
    contextMenuService.showSubject.subscribe(descriptor => {
      event.preventDefault();
      this.items = descriptor.items;

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

      this.show = true;
    });
  }

  click(item: ContextMenuItem): void {
    if (typeof item.click === 'function') {
      this.show = false;
      item.click();
    }
  }

  @HostListener('window:mousedown', ['$event'])
  mouseDownListener(event: MouseEvent): void {

    if ([MOUSE_BUTTON.LEFT, MOUSE_BUTTON.RIGHT].indexOf(event.button) === -1) {
      return;
    }

    const isContextMenuChild = !!DOMUtils.getParent(<HTMLElement> event.target, '.context-menu');

    if (!isContextMenuChild) {
      this.show = false;
    }
  }
}
