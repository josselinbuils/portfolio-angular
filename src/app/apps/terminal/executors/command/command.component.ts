import { Component, Input } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-terminal-command',
  templateUrl: './command.component.html',
  styleUrls: ['./command.component.scss'],
})
export class CommandComponent implements Executor {
  @Input() args!: string[];
}
