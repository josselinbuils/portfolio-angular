import { Component } from '@angular/core';
import { Executor } from '../executor';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent implements Executor {
  args: string[];
  commands: any[];

  constructor() {
    this.commands = [{
      command: 'projects',
      description: 'my GitHub projects'
    }, {
      command: 'skills',
      description: 'my main skills'
    }, {
      command: 'teravia',
      description: 'a small html5 game'
    }, {
      command: 'work',
      description: 'my work experience'
    }];
  }
}
