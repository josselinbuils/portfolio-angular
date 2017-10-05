import { AfterContentInit, Component, ElementRef, Input, Renderer2, ViewChild } from '@angular/core';

@Component({
  selector: 'app-window',
  templateUrl: './window.component.html',
  styleUrls: ['./window.component.css']
})
export class WindowComponent implements AfterContentInit {
  @ViewChild('content') contentElementRef: ElementRef;

  @Input() contentStyle: any;
  @Input() title: string;

  @Input()
  set scrollTop(value: number) {
    this.contentElementRef.nativeElement.scrollTop = value;
  }

  private lastDisplayProperties: any;
  private window: HTMLElement;

  constructor(private elementRef: ElementRef, private renderer: Renderer2) {
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

  startResize(): void {
    this.setSelectable(false);

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.setSize(this.window.clientWidth + moveEvent.movementX, this.window.clientHeight + moveEvent.movementY);
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
    this.setStyle('user-select', selectable ? 'auto' : 'none');
    this.renderer.setStyle(content, 'pointer-events', selectable ? 'auto' : 'none');
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
