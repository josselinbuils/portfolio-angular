import {
  AfterContentInit, Component, ComponentFactoryResolver, HostListener, OnInit, Type, ViewChild, ViewContainerRef
} from '@angular/core';

import { AboutComponent } from './executors/about/about.component';
import { BashErrorComponent } from './executors/bash-error/bash-error.component';
import { CommandComponent } from './executors/command/command.component';
import { Executor } from './executors/executor';
import { HelpComponent } from './executors/help/help.component';
import { ProjectsComponent } from './executors/projects/projects.component';
import { SkillsComponent } from './executors/skills/skills.component';
import { WorkComponent } from './executors/work/work.component';

enum KEY_CODE {
  BACK_SPACE = 8,
  DOWN = 40,
  ENTER = 13,
  UP = 38
}

const executors = {
  about: AboutComponent,
  help: HelpComponent,
  projects: ProjectsComponent,
  skills: SkillsComponent,
  work: WorkComponent
};

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css']
})
export class TerminalComponent implements AfterContentInit, OnInit {
  @ViewChild('vc', {read: ViewContainerRef}) viewContainerRef: ViewContainerRef;

  commandIndex: number;
  commands: string[];
  userInput: string;

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
    this.userInput = '';
    this.commandIndex = 0;
    this.commands = [];
  }

  private loadComponent(component: Type<{}>, args: any[]) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.viewContainerRef.createComponent(componentFactory);
    (<Executor> componentRef.instance).args = args;
  }

  private exec(str: string) {
    const command = str.trim().split(' ')[0];

    this.loadComponent(CommandComponent, [str]);

    if (command.length > 0) {
      this.commands.push(str);
      this.commandIndex = this.commands.length;

      if (executors[command]) {
        this.loadComponent(executors[command], str.split(' ').slice(1));
      } else {
        this.loadComponent(BashErrorComponent, [command]);
      }
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
