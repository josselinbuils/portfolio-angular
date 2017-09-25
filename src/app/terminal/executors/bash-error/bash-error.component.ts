import { Component, OnInit } from '@angular/core';
import { Executor } from '../executor';

@Component({
  selector: 'app-bash-error',
  templateUrl: './bash-error.component.html',
  styleUrls: ['./bash-error.component.css']
})
export class BashErrorComponent implements Executor, OnInit {
  args: string[];
  command: string;
  errorMessage: string;

  constructor() {
  }

  ngOnInit() {
    this.command = this.args[0];
    this.errorMessage = this.args[1];
  }
}
