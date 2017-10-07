import { AfterContentInit, Component, ViewChild, ViewContainerRef } from '@angular/core';
import { WindowManagerService } from './window-manager.service';
import { TerminalComponent } from './terminal/terminal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterContentInit {
  @ViewChild('windows', {read: ViewContainerRef}) windowsViewContainerRef: ViewContainerRef;

  constructor(private windowManagerService: WindowManagerService) {
  }

  ngAfterContentInit() {
    this.windowManagerService.setViewContainerRef(this.windowsViewContainerRef);
    this.windowManagerService.openWindow(TerminalComponent);
  }
}
