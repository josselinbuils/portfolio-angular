import {
  AfterContentInit, Component, ComponentRef, ElementRef, HostListener, Input, Renderer2, ViewChild
} from '@angular/core';

import { MOUSE_BUTTON } from '../../constants';
import { WindowManagerService } from './window-manager.service';

const ANIMATION_DURATION = 200;
const DOM_UPDATE_DELAY = 10;

@Component({
  selector: 'app-window',
  templateUrl: './window.component.html',
  styleUrls: ['./window.component.css']
})
export class WindowComponent implements AfterContentInit {
  @ViewChild('content') contentElementRef: ElementRef;
  @ViewChild('window') windowElementRef: ElementRef;

  @Input() background: string;
  @Input() height: number;
  @Input() keepContentRatio = false;
  @Input() maxHeight: number;
  @Input() maxWidth: number;
  @Input() minHeight = 100;
  @Input() minWidth = 100;
  @Input() resizable = true;
  @Input() titleColor: string;
  @Input() width: number;
  @Input() windowTitle: string;

  @Input()
  set scrollTop(value: number) {
    if (this.content) {
      this.content.scrollTop = value;
    }
  }

  active = false;
  animate = false;
  id: number;
  minimized = false;
  parentRef: ComponentRef<{}>;
  visible = true;
  zIndex: number;

  private content: HTMLElement;
  private contentRatio: number;
  private lastDisplayProperties: any = {};
  private maximized = false;
  private minimizedTopPosition: number;
  private window: HTMLElement;

  constructor(private renderer: Renderer2, private windowManagerService: WindowManagerService) {
  }

  canBeMaximized(): boolean {
    return !this.maxWidth && !this.maxHeight;
  }

  close(): void {
    this.windowManagerService.closeWindow(this.id);
  }

  hide() {
    if (this.visible) {
      this.animate = true;

      setTimeout(() => {
        this.lastDisplayProperties.minimize = this.window.getBoundingClientRect();

        this.minimized = true;
        this.setSize(0, 0, true);
        this.setPosition(60, this.minimizedTopPosition, true);

        setTimeout(() => {
          this.animate = false;
          this.visible = false;
        }, ANIMATION_DURATION + DOM_UPDATE_DELAY);
      }, DOM_UPDATE_DELAY);
    }
  }

  maximize(): void {

    if (!this.resizable || !this.canBeMaximized()) {
      return;
    }

    this.animate = true;

    setTimeout(() => {
      if (this.maximized) {
        const {left, top, width, height} = this.lastDisplayProperties.maximize;
        this.setSize(width, height);
        this.setPosition(left, top);
        this.maximized = false;
      } else {
        this.lastDisplayProperties.maximize = this.window.getBoundingClientRect();
        this.setMaxSize();
        this.setPosition(59, -1);
        this.maximized = true;
      }

      setTimeout(() => this.animate = false, ANIMATION_DURATION + DOM_UPDATE_DELAY);
    }, DOM_UPDATE_DELAY);
  }

  minimize(): void {
    this.windowManagerService.hideWindow(this.id);
  }

  select(): void {
    this.windowManagerService.selectWindow(this.id);
  }

  setMinimizedTopPosition(top: number) {
    this.minimizedTopPosition = top;
  }

  show() {
    if (!this.visible && this.lastDisplayProperties.minimize) {
      this.animate = true;

      setTimeout(() => {
        const {left, top, width, height} = this.lastDisplayProperties.minimize;

        this.minimized = false;
        this.setSize(width, height, true);
        this.setPosition(left, top, true);

        setTimeout(() => {
          this.animate = false;
          this.visible = true;
        }, ANIMATION_DURATION + DOM_UPDATE_DELAY);
      }, DOM_UPDATE_DELAY);
    }
  }

  startMove(downEvent: MouseEvent): void {

    if (downEvent.button !== MOUSE_BUTTON.LEFT) {
      return;
    }

    downEvent.preventDefault();

    if (this.maximized || (<HTMLElement> downEvent.target).className.indexOf('maximize') !== -1) {
      return;
    }

    const windowBoundingRect: any = this.window.getBoundingClientRect();
    const dx: number = windowBoundingRect.left - downEvent.clientX;
    const dy: number = windowBoundingRect.top - downEvent.clientY;

    this.setSelectable(false);

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.setPosition(moveEvent.clientX + dx, moveEvent.clientY + dy);
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      this.setSelectable(true);
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  startResize(downEvent: MouseEvent): void {

    if (downEvent.button !== MOUSE_BUTTON.LEFT) {
      return;
    }

    downEvent.preventDefault();

    if (this.maximized) {
      return;
    }

    this.setSelectable(false);

    const startSize = this.getSize();

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const width = startSize.width + moveEvent.clientX - downEvent.clientX;
      const height = startSize.height + moveEvent.clientY - downEvent.clientY;
      this.setSize(width, height);
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      const size = this.getSize();
      this.setSize(size.width, size.height);
      this.setSelectable(true);
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private setPosition(x: number, y: number, force: boolean = false): void {

    if (!force) {
      const xMin = -this.getSize().width + 90;
      const yMin = -1;
      const xMax = window.innerWidth - 30;
      const yMax = window.innerHeight - 21;

      x = Math.min(Math.max(x, xMin), xMax);
      y = Math.min(Math.max(y, yMin), yMax);
    }

    this.setStyle('left', x + 'px');
    this.setStyle('top', y + 'px');
  }

  private setSelectable(selectable: boolean): void {
    if (selectable) {
      this.renderer.removeStyle(this.window, 'user-select');
      this.renderer.removeStyle(this.content, 'pointer-events');
    } else {
      this.renderer.setStyle(this.window, 'user-select', 'none');
      this.renderer.setStyle(this.content, 'pointer-events', 'none');
    }
  }

  private getContentSize(): { width: number, height: number } {
    return {
      width: this.content.clientWidth,
      height: this.content.clientHeight
    };
  }

  private getSize(): { width: number, height: number } {
    return {
      width: this.window.clientWidth,
      height: this.window.clientHeight
    };
  }

  private setMaxSize(): void {
    const maxWidth = window.innerWidth - 58;
    const maxHeight = window.innerHeight + 2;
    this.setSize(maxWidth, maxHeight, true);
  }

  private setSize(width: number, height: number, force: boolean = false): void {

    if (!force) {
      width = Math.max(width, this.minWidth);
      height = Math.max(height, this.minHeight);

      if (this.maxWidth) {
        width = Math.min(width, this.maxWidth);
      }

      if (this.maxHeight) {
        height = Math.min(height, this.maxHeight);
      }

      if (this.contentRatio) {
        const contentSize = this.getContentSize();
        height = Math.round(contentSize.width / this.contentRatio) + this.getSize().height - contentSize.height;
      }
    }

    this.setStyle('width', width + 'px');
    this.setStyle('height', height + 'px');
  }

  private setStyle(property: string, value: any): void {
    this.renderer.setStyle(this.window, property, value);
  }

  @HostListener('window:resize')
  resizeHandler(): void {
    if (this.maximized) {
      this.setMaxSize();
    }
  }

  ngAfterContentInit(): void {
    this.content = this.contentElementRef.nativeElement;
    this.window = this.windowElementRef.nativeElement;

    let size = this.getSize();
    const width = this.width || size.width;
    const height = this.height || size.height;

    this.setSize(width, height);

    size = this.getSize();
    const x: number = Math.round((window.innerWidth - size.width) * 0.5);
    const y: number = Math.round((window.innerHeight - size.height) * 0.2);

    this.setPosition(x, y);

    if (this.keepContentRatio) {
      const contentSize = this.getContentSize();
      this.contentRatio = contentSize.width / contentSize.height;
    }
  }
}
