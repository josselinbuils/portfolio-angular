import { Component } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-build-manager',
  templateUrl: './build-manager.component.html',
  styleUrls: ['./build-manager.component.scss'],
})
export class BuildManagerComponent implements Executor {
  args!: string[];
  endPromise: Promise<void>;
  error?: string;
  logs: Log[] = [];

  constructor() {
    this.endPromise = new Promise<void>(resolve => {
      const ws = new WebSocket(`wss://${location.hostname}/build-manager`);
      ws.onmessage = event => this.logs.push(JSON.parse(event.data));
      ws.onerror = () => {
        this.error = '-buildmanager: an error occurred';
        resolve();
      };
    });
  }
}

interface Log {
  data: string;
  level: LogLevel;
  time: number;
}

enum LogLevel {
  Error = 'ERROR',
  Info = 'INFO',
}
