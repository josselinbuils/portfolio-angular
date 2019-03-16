import { Component, ViewChild } from '@angular/core';
import { WindowComponent, WindowInstance } from '@portfolio/platform/window';

@Component({
  selector: 'app-teravia',
  templateUrl: './teravia.component.html',
  styleUrls: ['./teravia.component.scss'],
})
export class TeraviaComponent implements WindowInstance {
  static appName = 'Teravia';
  static iconClass = 'fas fa-gamepad';

  @ViewChild(WindowComponent) windowComponent!: WindowComponent;

  title = TeraviaComponent.appName;
}
