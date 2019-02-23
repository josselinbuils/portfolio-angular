import {
  AfterContentInit, Component, HostListener, Renderer2, ViewChild, ViewContainerRef,
} from '@angular/core';

import { TerminalComponent } from './apps/terminal';
import { MouseButton } from './constants';
import { DeviceManagerService } from './platform/device-manager.service';
import { WindowManagerService } from './platform/window';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterContentInit {
  @ViewChild('windows', { read: ViewContainerRef }) windowsViewContainerRef!: ViewContainerRef;

  selectionStyle?: { [key: string]: number | string };

  constructor(private readonly deviceManagerService: DeviceManagerService,
              private readonly renderer: Renderer2,
              private readonly viewContainerRef: ViewContainerRef,
              private readonly windowManagerService: WindowManagerService) {}

  ngAfterContentInit(): void {

    if (this.deviceManagerService.isMobile()) {
      this.renderer.addClass(document.body, 'mobile-device');
      this.setOrientation();
    }

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

  @HostListener('window:resize')
  resizeHandler(): void {
    if (this.deviceManagerService.isMobile()) {
      this.renderer.removeClass(document.body, 'orientation-landscape');
      this.renderer.removeClass(document.body, 'orientation-portrait');
      this.setOrientation();
    }
  }

  private setOrientation(): void {
    this.renderer.addClass(document.body, `orientation-${this.deviceManagerService.getOrientation()}`);
  }

  private startSelect(downEvent: MouseEvent): void {

    if (downEvent.button !== MouseButton.Left) {
      return;
    }

    downEvent.preventDefault();

    const startX = downEvent.clientX;
    const startY = downEvent.clientY;

    this.selectionStyle = {
      display: 'block',
      width: 0,
      height: 0,
    };

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.selectionStyle = {
        ...this.selectionStyle,
        'left.px': Math.min(startX, moveEvent.clientX),
        'top.px': Math.min(startY, moveEvent.clientY),
        'width.px': Math.abs(moveEvent.clientX - startX),
        'height.px': Math.abs(moveEvent.clientY - startY),
      };
    });

    const cancelMouseUp = this.renderer.listen('window', 'mouseup', () => {
      delete this.selectionStyle;
      cancelMouseMove();
      cancelMouseUp();
    });
  }
}
