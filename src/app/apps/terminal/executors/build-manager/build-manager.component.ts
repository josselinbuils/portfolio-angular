import { Component, OnInit } from '@angular/core';
import { Deferred } from '@portfolio/platform/deferred';
import { default as AnsiUp } from 'ansi_up';

import { DEFAULT_ERROR_MESSAGE } from '../constants';
import { Executor } from '../executor';

@Component({
  selector: 'app-build-manager',
  templateUrl: './build-manager.component.html',
  styleUrls: ['./build-manager.component.scss'],
})
export class BuildManagerComponent implements Executor, OnInit {
  args!: string[];
  logs: Log[] = [];
  releaseDeferred = new Deferred<void>();
  showHelp = false;

  private ws?: WebSocket;

  ngOnInit(): void {
    const command = this.args[0];

    switch (command) {
      case '--help':
      case 'help':
      case undefined:
        this.showHelp = true;
        this.releaseDeferred.resolve();
        break;

      case 'logs':
        this.showLogs();
        break;

      default:
        this.onError('unknown command');
    }
  }

  onKill(): void {
    this.stopWsClient();
  }

  private hasOption(option: string): boolean {
    return this.args.slice(1).includes(`-${option}`);
  }

  private onError(errorMessage?: string): void {
    if (errorMessage === undefined) {
      errorMessage = DEFAULT_ERROR_MESSAGE;
    }
    this.stopWsClient();
    this.releaseDeferred.reject(new Error(errorMessage));
  }

  private showLogs(): void {
    const follow = this.hasOption('f');
    const ansiUp = new (AnsiUp as any)();

    this.startWsClient().onmessage = event => {
      try {
        const logs = JSON.parse(event.data);
        logs.forEach(log => {
          log.data = ansiUp.ansi_to_html(log.data)
            .replace(/\[(\d+)]/g, '<span class="step-number">$1</span>');
        });
        this.logs.push(...logs);

        if (!follow) {
          this.stopWsClient();
          this.releaseDeferred.resolve();
        }
      } catch (error) {
        this.onError();
      }
    };
  }

  private startWsClient(): WebSocket {
    this.ws = new WebSocket(`wss://${location.hostname}/build-manager`);
    this.ws.onerror = () => this.onError();
    return this.ws;
  }

  private stopWsClient(): void {
    if (this.ws !== undefined && this.ws.readyState < this.ws.CLOSING) {
      this.ws.close();
    }
  }
}

interface Log {
  data: string;
  level: string;
  time: number;
}
