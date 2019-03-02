import { Component, OnInit } from '@angular/core';

import { Executor } from '../executor';

@Component({
  selector: 'app-build-manager',
  templateUrl: './build-manager.component.html',
  styleUrls: ['./build-manager.component.scss'],
})
export class BuildManagerComponent implements Executor, OnInit {
  args!: string[];
  endPromise = new Promise<void>(resolve => this.unfreeze = resolve);
  error?: string;
  logs: Log[] = [];

  private unfreeze!: () => void;

  ngOnInit(): void {
    const ws = new WebSocket(`wss://${location.hostname}/build-manager`);

    ws.onmessage = event => {
      try {
        this.logs.push(...JSON.parse(event.data));
      } catch (error) {
        this.stop();
      }
    };

    ws.onerror = () => this.stop();
  }

  private stop(): void {
    this.error = '-buildmanager: an error occurred';
    this.unfreeze();
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
