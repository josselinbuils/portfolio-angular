import { Component } from '@angular/core';
import { Deferred } from '@portfolio/platform/deferred';
import * as AnsiToHtml from 'ansi-to-html';

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

  private ansi = new AnsiToHtml();
  private ws: WebSocket;

  constructor() {
    this.ws = new WebSocket(`wss://${location.hostname}/build-manager`);

    this.ws.onmessage = event => {
      try {
        this.logs.push(
          ...JSON.parse(event.data).forEach(log => log.data = this.ansi.toHtml(log.data)),
        );
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
