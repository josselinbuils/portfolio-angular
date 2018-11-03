import {
  AfterContentInit, Component, ComponentRef, ElementRef, EventEmitter, HostListener, Input, Output, Renderer2,
  ViewChild,
} from '@angular/core';

import { MOUSE_BUTTON } from 'app/constants';

import { DeviceManagerService } from '../device-manager.service';
import { DOMUtils } from '../dom-utils';

import { WindowManagerService } from './window-manager.service';

const ANIMATION_DURATION = 200;
const DOM_UPDATE_DELAY = 10;
const LEFT_OFFSET = 60;

@Component({
  selector: 'app-window',
  templateUrl: './window.component.html',
  styleUrls: ['./window.component.scss'],
})
export class WindowComponent implements AfterContentInit {
  @ViewChild('content') contentElementRef: ElementRef<HTMLDivElement>;
  @ViewChild('window') windowElementRef: ElementRef<HTMLDivElement>;

  @Input() background: string;

  @Input()
  set height(height: number) {
    this.effectiveHeight = height;

    if (this.contentInitialized) {
      this.startAnimation().ready(() => this.setSize(this.effectiveWidth, height));
    }
  }

  @Input() keepContentRatio = false;
  @Input() maxHeight: number;
  @Input() maxWidth: number;
  @Input() minHeight = 100;
  @Input() minWidth = 100;
  @Input() resizable = true;

  @Input() titleBackground: string;
  @Input() titleColor: string;

  @Input()
  set width(width: number) {
    this.effectiveWidth = width;

    if (this.contentInitialized) {
      this.startAnimation().ready(() => this.setSize(width, this.effectiveHeight));
    }
  }

  @Input() windowTitle: string;

  @Output() resize = new EventEmitter<{ width: number; height: number }>();

  active = false;
  animate = false;
  id: number;
  maximized = false;
  minimized = false;
  parentRef: ComponentRef<{}>;
  visible = true;
  zIndex: number;

  private content: HTMLElement;
  private contentInitialized = false;
  private contentRatio: number;
  private effectiveHeight: number;
  private effectiveWidth: number;
  private readonly lastDisplayProperties: { maximize?: ClientRect; minimize?: ClientRect } = {};
  private minimizedTopPosition: number;
  private window: HTMLElement;

  constructor(private readonly deviceManagerService: DeviceManagerService,
              private readonly renderer: Renderer2,
              private readonly windowManagerService: WindowManagerService) {}

  close(): void {
    this.windowManagerService.closeWindow(this.id);
  }

  hide(): void {
    if (this.visible) {
      if (this.deviceManagerService.isMobile()) {
        this.minimized = true;
        this.visible = false;
      } else {
        this.startAnimation()
          .ready(() => {
            this.lastDisplayProperties.minimize = this.window.getBoundingClientRect();
            this.minimized = true;
            this.setSize(0, 0, true);
            this.setPosition(60, this.minimizedTopPosition);
          })
          .finished(() => this.visible = false);
      }
    }
  }

  maximize(animationDelay: number = ANIMATION_DURATION): void {

    if (!this.resizable) {
      return;
    }

    this.startAnimation(animationDelay)
      .ready(() => {
        if (this.maximized) {
          const { left, top, width, height } = this.lastDisplayProperties.maximize;
          this.setSize(width, height);
          this.setPosition(left, top);
        } else {
          this.lastDisplayProperties.maximize = this.window.getBoundingClientRect();
          this.setMaxSize();
          this.setPosition(LEFT_OFFSET, 0);
        }
      })
      .finished(() => this.maximized = !this.maximized);
  }

  minimize(): void {
    this.windowManagerService.hideWindow(this.id);
  }

  ngAfterContentInit(): void {
    let size: { width: number; height: number };

    this.content = this.contentElementRef.nativeElement;
    this.window = this.windowElementRef.nativeElement;

    if (this.deviceManagerService.isMobile()) {
      this.maximized = true;
    } else {
      if (typeof this.effectiveWidth !== 'number' || typeof this.effectiveHeight !== 'number') {
        size = this.getSize();
      }

      const width = typeof this.effectiveWidth === 'number'
        ? this.effectiveWidth
        : size.width;

      const height = typeof this.effectiveHeight === 'number'
        ? this.effectiveHeight
        : size.height;

      this.setSize(width, height);

      size = this.getSize();
      const x = Math.round((window.innerWidth - size.width) * 0.5);
      const y = Math.round((window.innerHeight - size.height) * 0.2);

      this.setPosition(x, y);

      if (this.keepContentRatio) {
        const contentSize = this.getContentSize();
        this.contentRatio = contentSize.width / contentSize.height;
      }
    }

    this.contentInitialized = true;
  }

  @HostListener('window:resize')
  resizeHandler(): void {
    if (this.maximized && !this.deviceManagerService.isMobile()) {
      this.setMaxSize();
    }
  }

  select(): void {
    this.windowManagerService.selectWindow(this.id);
  }

  setMinimizedTopPosition(top: number): void {
    this.minimizedTopPosition = top;
  }

  show(): void {
    if (!this.visible) {
      if (this.deviceManagerService.isMobile()) {
        this.minimized = false;
        this.visible = true;
      } else if (this.lastDisplayProperties.minimize !== undefined) {
        this.startAnimation()
          .ready(() => {
            const { left, top, width, height } = this.lastDisplayProperties.minimize;
            this.minimized = false;
            this.setSize(width, height);
            this.setPosition(left, top, true);
          })
          .finished(() => this.visible = true);
      }
    }
  }

  startMove(downEvent: MouseEvent): void {

    if (downEvent.button !== MOUSE_BUTTON.LEFT) {
      return;
    }

    downEvent.preventDefault();

    if (DOMUtils.closest(<HTMLElement> downEvent.target, '.button') !== undefined) {
      return;
    }

    const windowBoundingRect = this.window.getBoundingClientRect();
    const dx = windowBoundingRect.left - downEvent.clientX;
    const dy = windowBoundingRect.top - downEvent.clientY;
    let maximized = this.maximized;

    this.setSelectable(false);

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      if (maximized) {
        maximized = false;
        this.maximize(50);
      }
      this.setPosition(moveEvent.clientX + dx, moveEvent.clientY + dy);
    });

    const cancelMouseUp = this.renderer.listen('window', 'mouseup', () => {
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

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const width = startSize.width + moveEvent.clientX - downEvent.clientX;
      const height = startSize.height + moveEvent.clientY - downEvent.clientY;
      this.setSize(width, height);
    });

    const cancelMouseUp = this.renderer.listen('window', 'mouseup', () => {
      const size = this.getSize();
      this.setSize(size.width, size.height);
      this.setSelectable(true);
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private getContentSize(): { width: number; height: number } {
    return {
      width: this.content.clientWidth,
      height: this.content.clientHeight,
    };
  }

  private getSize(): { width: number; height: number } {
    return {
      width: this.window.clientWidth,
      height: this.window.clientHeight,
    };
  }

  private setMaxSize(): void {
    const maxWidth = window.innerWidth - LEFT_OFFSET;
    const maxHeight = window.innerHeight;
    this.setSize(maxWidth, maxHeight, true);
  }

  private setPosition(x: number, y: number, force: boolean = false): void {

    if (!force) {
      // This cannot be done when showing again a minimized window because its dimensions are null
      const xMin = -this.getSize().width + 90;
      const yMin = -1;
      const xMax = window.innerWidth - 30;
      const yMax = window.innerHeight - 21;

      x = Math.min(Math.max(x, xMin), xMax);
      y = Math.min(Math.max(y, yMin), yMax);
    }

    this.setStyle('left', `${x}px`);
    this.setStyle('top', `${y}px`);
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

  private setSize(width: number, height: number, force: boolean = false): void {

    if (!force) {
      width = Math.max(width, this.minWidth);
      height = Math.max(height, this.minHeight);

      if (typeof this.maxWidth === 'number') {
        width = Math.min(width, this.maxWidth);
      }

      if (typeof this.maxHeight === 'number') {
        height = Math.min(height, this.maxHeight);
      }

      if (typeof this.contentRatio === 'number') {
        const size = this.getSize();
        const contentSize = this.getContentSize();
        const dx = size.width - contentSize.width;
        const dy = size.height - contentSize.height;
        height = Math.round((width - dx) / this.contentRatio) + dy;
      }
    }

    this.setStyle('width', `${width}px`);
    this.setStyle('height', `${height}px`);

    this.resize.emit({ width, height });
  }

  private setStyle(property: string, value: number | string): void {
    this.renderer.setStyle(this.window, property, value);
  }

  private startAnimation(animationDuration: number = ANIMATION_DURATION): WindowAnimation {
    let finished: () => void;
    let ready: () => void;

    const windowAnimation: WindowAnimation = {
      finished: (finishedCallback: () => void): WindowAnimation => {
        finished = finishedCallback;
        return windowAnimation;
      },
      ready: (readyCallback: () => void): WindowAnimation => {
        ready = readyCallback;
        return windowAnimation;
      },
    };

    this.animate = true;

    setTimeout(() => {
      if (typeof ready === 'function') {
        ready();
      }

      setTimeout(() => {
        this.animate = false;

        if (typeof finished === 'function') {
          finished();
        }
      }, animationDuration + DOM_UPDATE_DELAY);

    }, DOM_UPDATE_DELAY);

    return windowAnimation;
  }
}

interface WindowAnimation {
  finished(finishedCallback: () => void): WindowAnimation;

  ready(readyCallback: () => void): WindowAnimation;
}
