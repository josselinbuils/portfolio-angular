import { Component, ViewChild } from '@angular/core';
import { WindowComponent } from '../window/window.component';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-teravia',
  templateUrl: './teravia.component.html',
  styleUrls: ['./teravia.component.css']
})
export class TeraviaComponent extends WindowInstance {
  static iconClass = 'fa-gamepad';

  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  constructor() {
    super();
  }
}
