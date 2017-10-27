import { Component, ViewChild } from '@angular/core';
import { WindowComponent } from '../../platform/window/window.component';
import { WindowInstance } from '../../platform/window/window-instance';

@Component({
  selector: 'app-teravia',
  templateUrl: './teravia.component.html',
  styleUrls: ['./teravia.component.css']
})
export class TeraviaComponent implements WindowInstance {
  static appName = 'Teravia';
  static iconClass = 'fa-gamepad';

  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  title = TeraviaComponent.appName;
}