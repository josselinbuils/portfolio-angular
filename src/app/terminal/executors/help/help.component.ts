import { Component } from '@angular/core';
import { Executor } from '../executor';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent implements Executor {
  args: string[];

  constructor() {
  }
}
