import { AfterContentInit, Component, ElementRef, Input, Renderer2, ViewChild } from '@angular/core';
import { WindowManagerService } from '../window-manager.service';

@Component({
  selector: 'app-window',
  templateUrl: './window.component.html',
  styleUrls: ['./window.component.css']
})
export class WindowComponent implements AfterContentInit {
  @ViewChild('content') contentElementRef: ElementRef;

  @Input() closable: boolean;
  @Input() contentStyle: any;
  @Input() title: string;
  @Input() id: number;

  @Input()
  set scrollTop(value: number) {
    this.contentElementRef.nativeElement.scrollTop = value;
  }

  private lastDisplayProperties: any;
  private window: HTMLElement;

  constructor(private elementRef: ElementRef, private renderer: Renderer2, private windowManagerService: WindowManagerService) {
  }

  close(): void {
    this.windowManagerService.closeWindow(this.id);
  }

  maximize(): void {
    const displayProperties = this.window.getBoundingClientRect();
    const {left, top, width, height} = displayProperties;
    const xMin = -1;
    const yMin = -1;
    const maxWidth = window.innerWidth + 2;
    const maxHeight = window.innerHeight + 2;

    if (left === xMin && top === yMin && width === maxWidth && height === maxHeight) {
      const last = this.lastDisplayProperties;
      this.setSize(last.width, last.height);
      this.setPosition(last.left, last.top);
    } else {
      this.lastDisplayProperties = displayProperties;
      this.setPosition(xMin, yMin);
      this.setSize(maxWidth, maxHeight);
    }
  }

  startMove(downEvent: MouseEvent): void {

    if ((<HTMLElement> downEvent.target).className.indexOf('maximize') !== -1) {
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
    this.setSelectable(false);

    const startWidth = this.window.clientWidth;
    const startHeight = this.window.clientHeight;

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      const width = startWidth + moveEvent.clientX - downEvent.clientX;
      const height = startHeight + moveEvent.clientY - downEvent.clientY;
      this.setSize(width, height);
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      this.setSize(this.window.clientWidth, this.window.clientHeight);
      this.setSelectable(true);
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private setPosition(x: number, y: number): void {
    const xMin = -this.window.clientWidth + 30;
    const yMin = -1;
    const xMax = window.innerWidth + 30;
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

  private setSize(width: number, height: number): void {
    this.setStyle('width', width + 'px');
    this.setStyle('height', height + 'px');
  }

  private setStyle(property: string, value: any): void {
    this.renderer.setStyle(this.window, property, value);
  }

  ngAfterContentInit(): void {
    this.window = this.elementRef.nativeElement;

    const x: number = Math.round((window.innerWidth - this.window.clientWidth) * 0.5);
    const y: number = Math.round((window.innerHeight - this.window.clientHeight) * 0.2);

    this.setSize(this.window.clientWidth, this.window.clientHeight);
    this.setPosition(x, y);
  }
}
