import {
  AfterContentInit, Component, ComponentRef, ElementRef, EventEmitter, HostListener, Input, Output, Renderer2,
  ViewChild,
} from '@angular/core';
import { MouseButton } from '@portfolio/constants';

import { DeviceManagerService } from '../device-manager.service';
import { DOMUtils } from '../dom-utils';

import { WindowManagerService } from './window-manager.service';

const ANIMATION_DURATION = 200;
const BUTTONS_WIDTH = 66;
const DOM_UPDATE_DELAY = 10;
const LEFT_OFFSET = 60;

@Component({
  selector: 'app-window',
  templateUrl: './window.component.html',
  styleUrls: ['./window.component.scss'],
})
export class WindowComponent implements AfterContentInit {
  @ViewChild('buttons') buttonsElementRef!: ElementRef<HTMLDivElement>;
  @ViewChild('content') contentElementRef!: ElementRef<HTMLDivElement>;
  @ViewChild('window') windowElementRef!: ElementRef<HTMLDivElement>;

  @Input() background!: string;

  @Input()
  set height(height: number) {
    this.effectiveHeight = height;

    if (this.contentInitialized) {
      this.startAnimation().ready(() => {
        if (this.effectiveWidth !== undefined) {
          this.setSize(this.effectiveWidth, height);
        }
      });
    }
  }

  @Input() keepContentRatio = false;
  @Input() maxHeight?: number;
  @Input() maxWidth?: number;
  @Input() minHeight = 100;
  @Input() minWidth = 100;
  @Input() resizable = true;
  @Input() titleBackground!: string;
  @Input() titleColor!: string;

  @Input()
  set width(width: number) {
    this.effectiveWidth = width;

    if (this.contentInitialized) {
      this.startAnimation().ready(() => {
        if (this.effectiveHeight !== undefined) {
          this.setSize(width, this.effectiveHeight);
        }
      });
    }
  }

  @Input() windowTitle!: string;

  @Output() resize = new EventEmitter<{ width: number; height: number }>();

  active = false;
  animate = false;
  id!: number;
  maximized = false;
  minimized = false;
  parentRef!: ComponentRef<{}>;
  visible = true;
  zIndex!: number;

  private buttons?: HTMLElement;
  private content?: HTMLElement;
  private contentInitialized = false;
  private contentRatio?: number;
  private effectiveHeight?: number;
  private effectiveWidth?: number;
  private readonly lastDisplayProperties: { maximize?: ClientRect; minimize?: ClientRect } = {};
  private minimizedTopPosition?: number;
  private window?: HTMLElement;

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
            this.lastDisplayProperties.minimize = (this.window as HTMLElement).getBoundingClientRect();
            this.minimized = true;
            this.setSize(0, 0, true);

            if (this.minimizedTopPosition !== undefined) {
              this.setPosition(60, this.minimizedTopPosition);
            }
          })
          .finished(() => this.visible = false);
      }
    }
  }

  minimize(): void {
    this.windowManagerService.hideWindow(this.id);
  }

  ngAfterContentInit(): void {
    this.buttons = this.buttonsElementRef.nativeElement;
    this.content = this.contentElementRef.nativeElement;
    this.window = this.windowElementRef.nativeElement;

    if (this.deviceManagerService.isMobile()) {
      this.maximized = true;
    } else {
      const width = this.effectiveWidth !== undefined
        ? this.effectiveWidth
        : this.getSize().width;

      const height = this.effectiveHeight !== undefined
        ? this.effectiveHeight
        : this.getSize().height;

      this.setSize(width, height);

      const size = this.getSize();
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
            if (this.lastDisplayProperties.minimize !== undefined) {
              const { left, top, width, height } = this.lastDisplayProperties.minimize;
              this.minimized = false;
              this.setSize(width, height);
              this.setPosition(left, top, true);
            }
          })
          .finished(() => this.visible = true);
      }
    }
  }

  startMove(downEvent: MouseEvent): void {

    if (downEvent.button !== MouseButton.Left) {
      return;
    }

    downEvent.preventDefault();

    if (DOMUtils.closest(downEvent.target as HTMLElement, '.button') !== undefined) {
      return;
    }

    const windowBoundingRect = (this.window as HTMLElement).getBoundingClientRect();
    const dy = windowBoundingRect.top - downEvent.clientY;
    let dx = windowBoundingRect.left - downEvent.clientX;
    let maximized = this.maximized;

    this.setSelectable(false);

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      if (moveEvent.clientX === downEvent.clientX && moveEvent.clientY === downEvent.clientY) {
        return;
      }
      if (maximized && this.lastDisplayProperties.maximize !== undefined) {
        const widthRatio = this.lastDisplayProperties.maximize.width / windowBoundingRect.width;

        // Keeps the same position on the title bar in proportion to its width
        dx += (downEvent.offsetX * widthRatio) > BUTTONS_WIDTH
          ? downEvent.offsetX * (1 - widthRatio)
          : downEvent.offsetX - BUTTONS_WIDTH;

        maximized = false;
        this.toggleMaximize(true, 50);
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

    if (downEvent.button !== MouseButton.Left) {
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

  toggleMaximize(keepPosition: boolean = false, animationDelay: number = ANIMATION_DURATION): void {
    if (!this.resizable) {
      return;
    }
    this.startAnimation(animationDelay)
      .ready(() => {
        if (this.maximized && this.lastDisplayProperties.maximize !== undefined) {
          const { left, top, width, height } = this.lastDisplayProperties.maximize;

          if (!keepPosition) {
            this.setPosition(left, top);
          }
          this.setSize(width, height);

        } else {
          this.lastDisplayProperties.maximize = (this.window as HTMLElement).getBoundingClientRect();

          if (!keepPosition) {
            this.setPosition(LEFT_OFFSET, 0);
          }
          this.setMaxSize();
        }
      })
      .finished(() => this.maximized = !this.maximized);
  }

  private getContentSize(): { height: number; width: number } {
    let width = 0;
    let height = 0;

    if (this.content !== undefined) {
      width = this.content.clientWidth;
      height = this.content.clientHeight;
    }
    return { height, width };
  }

  private getSize(): { width: number; height: number } {
    let width = 0;
    let height = 0;

    if (this.window !== undefined) {
      width = this.window.clientWidth;
      height = this.window.clientHeight;
    }
    return { height, width };
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
      this.renderer.removeStyle(this.buttons, 'pointer-events');
      this.renderer.removeStyle(this.content, 'pointer-events');
    } else {
      this.renderer.setStyle(this.buttons, 'pointer-events', 'none');
      this.renderer.setStyle(this.content, 'pointer-events', 'none');
    }
  }

  private setSize(width: number, height: number, force: boolean = false): void {

    if (!force) {
      width = Math.max(width, this.minWidth);
      height = Math.max(height, this.minHeight);

      if (this.maxWidth !== undefined) {
        width = Math.min(width, this.maxWidth);
      }

      if (this.maxHeight !== undefined) {
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
