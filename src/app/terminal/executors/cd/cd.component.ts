import { Component, OnInit } from '@angular/core';
import { Executor } from '../executor';

const directories = ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'srv', 'usr', 'var', 'tmp'];

@Component({
  selector: 'app-cd',
  templateUrl: './cd.component.html',
  styleUrls: ['./cd.component.css']
})
export class CdComponent implements Executor, OnInit {
  args: string[];
  dir: string;
  errorMessage: string;

  constructor() {
  }

  ngOnInit(): void {
    this.dir = this.args[0];
    this.errorMessage = directories.indexOf(this.dir) !== -1
      ? 'Permission denied'
      : 'No such file or directory';
  }
}
