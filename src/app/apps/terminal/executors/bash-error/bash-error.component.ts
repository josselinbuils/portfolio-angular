import { Component, OnInit } from '@angular/core';
import { Executor } from '../executor';

const commands = [
  'cat', 'cd', 'chmod', 'chown', 'cp', 'kill', 'locate', 'ls', 'man', 'mkdir', 'mv', 'passwd', 'pwd', 'rm', 'rmdir',
  'ssh', 'su', 'sudo', 'touch', 'whereis', 'who'
];

@Component({
  selector: 'app-bash-error',
  templateUrl: './bash-error.component.html',
  styleUrls: ['./bash-error.component.scss']
})
export class BashErrorComponent implements Executor, OnInit {
  args: string[];
  command: string;
  errorMessage: string;

  ngOnInit() {
    this.command = this.args[0];
    this.errorMessage = commands.indexOf(this.command) !== -1 ? 'Permission denied' : 'command not found';
  }
}
