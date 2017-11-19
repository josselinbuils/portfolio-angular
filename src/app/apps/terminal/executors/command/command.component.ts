import { Component, OnInit } from '@angular/core';
import { Executor } from '../executor';

@Component({
  selector: 'app-command',
  templateUrl: './command.component.html',
  styleUrls: ['./command.component.scss']
})
export class CommandComponent implements Executor, OnInit {
  args: string[];
  command: string;

  ngOnInit() {
    this.command = this.args.join(' ');
  }
}
