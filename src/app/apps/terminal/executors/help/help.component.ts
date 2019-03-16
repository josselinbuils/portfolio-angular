import { Component } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-terminal-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
})
export class HelpComponent implements Executor {
  args!: string[];
  commands = [
    {
      command: 'bm',
      description: 'build manager',
    },
    {
      command: 'open',
      description: 'open an application',
    },
    {
      command: 'projects',
      description: 'show my GitHub projects',
    },
    {
      command: 'skills',
      description: 'show my main skills',
    },
    {
      command: 'work',
      description: 'show my work experience',
    },
  ];
}
