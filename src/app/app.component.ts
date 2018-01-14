import {
  AfterContentInit, Component, HostListener, Renderer2, ViewChild, ViewContainerRef,
} from '@angular/core';

import { TerminalComponent } from './apps/terminal/terminal.component';
import { MOUSE_BUTTON } from './constants';
import { WindowManagerService } from './platform/window/window-manager.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterContentInit {
  @ViewChild('windows', {read: ViewContainerRef}) windowsViewContainerRef: ViewContainerRef;

  selectionStyle: any = null;

  constructor(private renderer: Renderer2, private viewContainerRef: ViewContainerRef,
              private windowManagerService: WindowManagerService) {
  }

  ngAfterContentInit(): void {
    this.windowManagerService.setViewContainerRef(this.windowsViewContainerRef);
    this.windowManagerService.openWindow(TerminalComponent);
  }

  @HostListener('mousedown', ['$event'])
  mouseDownListener(event: MouseEvent): void {
    if (event.target === this.viewContainerRef.element.nativeElement) {
      this.windowManagerService.unselectAllWindows();
      this.startSelect(event);
    }
  }

  private startSelect(downEvent: MouseEvent): void {

    if (downEvent.button !== MOUSE_BUTTON.LEFT) {
      return;
    }

    downEvent.preventDefault();

    const startX: number = downEvent.clientX;
    const startY: number = downEvent.clientY;

    this.selectionStyle = {
      display: 'block',
      width: 0,
      height: 0,
    };

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.selectionStyle['left.px'] = Math.min(startX, moveEvent.clientX);
      this.selectionStyle['top.px'] = Math.min(startY, moveEvent.clientY);
      this.selectionStyle['width.px'] = Math.abs(moveEvent.clientX - startX);
      this.selectionStyle['height.px'] = Math.abs(moveEvent.clientY - startY);
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      this.selectionStyle = null;
      cancelMouseMove();
      cancelMouseUp();
    });
  }
}
