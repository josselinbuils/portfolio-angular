import { Component } from '@angular/core';
import { Deferred } from '@portfolio/platform/deferred';
import { default as AnsiUp } from 'ansi_up';

import { DEFAULT_ERROR_MESSAGE } from '../constants';
import { Executor } from '../executor';

@Component({
  selector: 'app-build-manager',
  templateUrl: './build-manager.component.html',
  styleUrls: ['./build-manager.component.scss'],
})
export class BuildManagerComponent implements Executor {
  args!: string[];
  releaseDeferred = new Deferred<void>();
  logs: Log[] = [];

  private ansiUp = new (AnsiUp as any)();
  private ws: WebSocket;

  constructor() {
    this.ws = new WebSocket(`wss://${location.hostname}/build-manager`);

    this.ws.onmessage = event => {
      try {
        const logs = JSON.parse(event.data);
        logs.forEach(log => log.data = this.ansiUp.ansi_to_html(log.data));
        this.logs.push(...logs);
      } catch (error) {
        this.onError();
      }
    };

    this.ws.onerror = () => this.onError();
  }

  onKill(): void {
    if (this.ws.readyState < this.ws.CLOSING) {
      this.ws.close();
    }
  }

  private onError(): void {
    this.releaseDeferred.reject(new Error(DEFAULT_ERROR_MESSAGE));
  }
}

interface Log {
  data: string;
  level: string;
  time: number;
}
