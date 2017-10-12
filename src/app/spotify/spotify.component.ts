import { Component } from '@angular/core';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-spotify',
  templateUrl: './spotify.component.html',
  styleUrls: ['./spotify.component.css']
})
export class SpotifyComponent extends WindowInstance {
  static iconClass = 'fa-spotify';

  constructor() {
    super();
  }
}
