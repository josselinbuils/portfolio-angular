import { AfterContentInit, Component, ElementRef, Input, Renderer2, ViewChild } from '@angular/core';
import { WindowManagerService } from '../window-manager.service';

@Component({
  selector: 'app-window',
  templateUrl: './window.component.html',
  styleUrls: ['./window.component.css']
})
export class WindowComponent implements AfterContentInit {
  @ViewChild('content') contentElementRef: ElementRef;
  @ViewChild('window') windowElementRef: ElementRef;

  @Input() active = false;
  @Input() contentStyle: any;
  @Input() height: number;
  @Input() id: number;
  @Input() maxHeight: number;
  @Input() maxWidth: number;
  @Input() resizable = true;
  @Input() title: string;
  @Input() width: number;

  @Input()
  set scrollTop(value: number) {
    this.contentElementRef.nativeElement.scrollTop = value;
  }

  private lastDisplayProperties: any;
  private maximized = false;
  private window: HTMLElement;

  constructor(private renderer: Renderer2, private windowManagerService: WindowManagerService) {
  }

  canBeMaximized(): boolean {
    return !this.maxWidth && !this.maxHeight;
  }

  close(): void {
    this.windowManagerService.closeWindow(this.id);
  }

  maximize(): void {

    if (!this.resizable || !this.canBeMaximized()) {
      return;
    }

    if (this.maximized) {
      const {left, top, width, height} = this.lastDisplayProperties;
      this.setSize(width, height);
      this.setPosition(left, top);
      this.maximized = false;
    } else {
      const xMin = 59;
      const yMin = -1;
      const maxWidth = window.innerWidth - 58;
      const maxHeight = window.innerHeight + 2;

      this.lastDisplayProperties = this.window.getBoundingClientRect();
      this.setPosition(xMin, yMin);
      this.setSize(maxWidth, maxHeight);
      this.maximized = true;
    }
  }

  select(): void {
    this.windowManagerService.selectWindow(this.id);
  }

  startMove(downEvent: MouseEvent): void {

    this.select();

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

    this.select();

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

  private setPosition(x: number, y: number): void {
    const xMin = -this.getSize().width + 90;
    const yMin = -1;
    const xMax = window.innerWidth - 30;
    const yMax = window.innerHeight - 21;

    x = Math.min(Math.max(x, xMin), xMax);
    y = Math.min(Math.max(y, yMin), yMax);

    this.setStyle('left', x + 'px');
    this.setStyle('top', y + 'px');
  }

  private setSelectable(selectable: boolean): void {
    const content = this.contentElementRef.nativeElement;

    if (selectable) {
      this.renderer.removeStyle(this.window, 'user-select');
      this.renderer.removeStyle(content, 'pointer-events');
    } else {
      this.renderer.setStyle(this.window, 'user-select', 'none');
      this.renderer.setStyle(content, 'pointer-events', 'none');
    }
  }

  private getSize(): { width: number, height: number } {
    return {
      width: this.window.clientWidth,
      height: this.window.clientHeight
    };
  }

  private setSize(width: number, height: number): void {

    if (this.maxWidth) {
      width = Math.min(width, this.maxWidth);
    }

    if (this.maxHeight) {
      height = Math.min(height, this.maxHeight);
    }

    this.setStyle('width', width + 'px');
    this.setStyle('height', height + 'px');
  }

  private setStyle(property: string, value: any): void {
    this.renderer.setStyle(this.window, property, value);
  }

  ngAfterContentInit(): void {
    this.window = this.windowElementRef.nativeElement;

    const size = this.getSize();
    const width = this.width || size.width;
    const height = this.height || size.height;
    const x: number = Math.round((window.innerWidth - width) * 0.5);
    const y: number = Math.round((window.innerHeight - height) * 0.2);

    this.setSize(width, height);
    this.setPosition(x, y);
  }
}
