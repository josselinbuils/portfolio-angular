import { Component } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-work',
  templateUrl: './work.component.html',
  styleUrls: ['./work.component.scss'],
})
export class WorkComponent implements Executor {
  args!: string[];
}
