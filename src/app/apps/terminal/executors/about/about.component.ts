import { Component } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-terminal-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent implements Executor {
  args!: string[];
}
