import { AfterContentInit, Component, HostListener, OnInit } from '@angular/core';

import about from './commands/about.html';

import charizard from './commands/charizard.html';
import { cd } from './commands/cd';
import hello from './commands/hello.html';
import help from './commands/help.html';
import ls from './commands/ls.html';
import work from './commands/work.html';

const commands = {
  about,
  cd: cd,
  charizard,
  clear: terminal => terminal.content = '',
  hello,
  help,
  ls,
  work
};

enum KEY_CODE {
  BACK_SPACE = 8,
  DOWN = 40,
  ENTER = 13,
  UP = 38
}

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css']
})
export class TerminalComponent implements AfterContentInit, OnInit {
  commandIndex: number;
  commands: string[];
  content: string;
  userInput: string;

  constructor() {
    this.content = '';
    this.userInput = '';
    this.commandIndex = 0;
    this.commands = [];
  }

  private exec(str) {
    const command = str.split(' ')[0];

    if (command.length > 0) {
      this.commands.push(str);
      this.commandIndex = this.commands.length;
      this.content += `<p>josselinbuils$ ${str}</p>`;

      if (commands[command]) {
        if (typeof commands[command] === 'function') {
          commands[command](this, str.split(' ').slice(1));
        } else {
          this.content += commands[command];
        }
      } else {
        this.content += `<p>-bash: ${command}: command not found</p>`;
      }

    } else {
      this.content += '<p>josselinbuils$</p>';
    }
  }

  @HostListener('window:keydown', ['$event'])
  keyboardListener(event: KeyboardEvent) {
    if (event.key.length === 1) {
      if (!event.altKey && !event.metaKey) {
        this.userInput += event.key;
      }
    } else {
      switch (event.keyCode) {
        case KEY_CODE.BACK_SPACE:
          this.userInput = this.userInput.slice(0, -1);
          break;
        case KEY_CODE.ENTER:
          this.exec(this.userInput);
          this.userInput = '';
          break;
        case KEY_CODE.UP:
          event.preventDefault();
          if (this.commandIndex > 0) {
            this.commandIndex--;
            this.userInput = this.commands[this.commandIndex];
          }
          break;
        case KEY_CODE.DOWN:
          event.preventDefault();
          if (this.commandIndex < (this.commands.length - 1)) {
            this.commandIndex++;
            this.userInput = this.commands[this.commandIndex];
          }
      }
    }
  }

  ngOnInit(): void {
    this.exec('about');
  }

  ngAfterContentInit(): void {
    const content = document.querySelector('app-terminal .content');

    new MutationObserver(() => content.scrollTop = content.scrollHeight - content.clientHeight)
      .observe(content, {
        childList: true,
        subtree: true
      });
  }
}
