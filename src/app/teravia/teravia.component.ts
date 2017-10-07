import { Component } from '@angular/core';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-teravia',
  templateUrl: './teravia.component.html',
  styleUrls: ['./teravia.component.css']
})
export class TeraviaComponent extends WindowInstance {
  static iconClass = 'fa-gamepad';

  constructor() {
    super();
  }
}
