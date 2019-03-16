import { Component } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-terminal-work',
  templateUrl: './work.component.html',
  styleUrls: ['./work.component.scss'],
})
export class WorkComponent implements Executor {
  args!: string[];
}
