import { Component } from '@angular/core';
import { Executor } from '../executor';

@Component({
  selector: 'app-ls',
  templateUrl: './ls.component.html',
  styleUrls: ['./ls.component.css']
})
export class LsComponent implements Executor {
  args: string[];
  directories: string[] = ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'srv', 'usr', 'var', 'tmp'];

  constructor() {
  }
}
