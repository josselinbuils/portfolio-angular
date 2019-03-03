import { Component } from '@angular/core';
import { Deferred } from '@portfolio/platform/deferred';

import { Executor } from '../executor';

@Component({
  selector: 'app-build-manager',
  templateUrl: './build-manager.component.html',
  styleUrls: ['./build-manager.component.scss'],
})
export class BuildManagerComponent implements Executor {
  args!: string[];
  releaseDeferred = new Deferred<void>();
  error?: string;
  logs: Log[] = [];

  private ws: WebSocket;

  constructor() {
    this.ws = new WebSocket(`wss://${location.hostname}/build-manager`);

    this.ws.onmessage = event => {
      try {
        this.logs.push(...JSON.parse(event.data));
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
    this.error = '-buildmanager: an error occurred';
    this.releaseDeferred.resolve();
  }
}

interface Log {
  data: string;
  level: string;
  time: number;
}
