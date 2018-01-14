import { Component } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
})
export class HelpComponent implements Executor {
  args: string[];
  commands = [{
    command: 'projects',
    description: 'my GitHub projects',
  }, {
    command: 'skills',
    description: 'my main skills',
  }, {
    command: 'work',
    description: 'my work experience',
  }];
}
