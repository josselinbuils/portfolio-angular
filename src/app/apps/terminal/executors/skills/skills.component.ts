import { Component } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-terminal-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.scss'],
})
export class SkillsComponent implements Executor {
  args!: string[];
}
