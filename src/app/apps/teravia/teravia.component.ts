import { Component, ViewChild } from '@angular/core';
import { WindowInstance } from 'app/platform/window/window-instance';
import { WindowComponent } from 'app/platform/window/window.component';

@Component({
  selector: 'app-teravia',
  templateUrl: './teravia.component.html',
  styleUrls: ['./teravia.component.scss'],
})
export class TeraviaComponent implements WindowInstance {
  static appName = 'Teravia';
  static iconClass = 'fa-gamepad';

  @ViewChild(WindowComponent) windowComponent!: WindowComponent;

  title = TeraviaComponent.appName;
}
