import { Component } from '@angular/core';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.css']
})
export class BrowserComponent implements WindowInstance {
  contentStyle = {background: '#fff'};
  windowId: number;

  constructor() {
  }
}
