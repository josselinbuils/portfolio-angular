import { Component } from '@angular/core';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.css']
})
export class BrowserComponent extends WindowInstance {
  constructor() {
    super();
    this.iconClass = 'fa-gamepad';
  }
}
