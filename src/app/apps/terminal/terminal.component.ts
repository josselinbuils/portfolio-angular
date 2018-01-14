import {
  AfterContentInit, Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, ElementRef, HostListener,
  OnInit, Type, ViewChild, ViewContainerRef,
} from '@angular/core';

import { WindowInstance } from '../../platform/window/window-instance';
import { WindowComponent } from '../../platform/window/window.component';

import { AboutComponent } from './executors/about/about.component';
import { BashErrorComponent } from './executors/bash-error/bash-error.component';
import { CommandComponent } from './executors/command/command.component';
import { Executor } from './executors/executor';
import { HelpComponent } from './executors/help/help.component';
import { OpenComponent } from './executors/open/open.component';
import { ProjectsComponent } from './executors/projects/projects.component';
import { SkillsComponent } from './executors/skills/skills.component';
import { WorkComponent } from './executors/work/work.component';

enum KEY_CODE {
  BACK_SPACE = 8,
  DOWN = 40,
  ENTER = 13,
  K = 75,
  LEFT = 37,
  RIGHT = 39,
  UP = 38,
}

const executors: any = {
  about: AboutComponent,
  help: HelpComponent,
  open: OpenComponent,
  projects: ProjectsComponent,
  skills: SkillsComponent,
  work: WorkComponent,
};

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss'],
})
export class TerminalComponent implements AfterContentInit, OnInit, WindowInstance {
  static appName = 'Terminal';
  static iconClass = 'fa-terminal';

  @ViewChild('commands', {read: ViewContainerRef}) commandsViewContainerRef: ViewContainerRef;
  @ViewChild('terminal') terminalElementRef: ElementRef;
  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  caretIndex = 0;
  contentStyle: any = {};
  prefix = 'user$';
  userInput = '';
  title = TerminalComponent.appName;

  private commandIndex = 0;
  private commands: string[] = [];
  private components: ComponentRef<{}>[] = [];

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
  }

  @HostListener('window:keydown', ['$event'])
  keyboardListener(event: KeyboardEvent): void {

    if (!this.windowComponent.active) {
      return;
    }

    if (!event.altKey && (event.metaKey || event.ctrlKey) && event.keyCode === KEY_CODE.K) {
      event.preventDefault();
      this.clear();

    } else if (event.key.length === 1) {

      if (/[a-z]/i.test(event.key) && (event.altKey || event.metaKey || event.ctrlKey)) {
        return;
      }

      event.preventDefault();
      this.userInput = this.userInput.slice(0, this.caretIndex) + event.key + this.userInput.slice(this.caretIndex);
      this.caretIndex++;

    } else if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      this.navigate(event);
    }
  }

  ngOnInit(): void {
    this.exec('about');
  }

  ngAfterContentInit(): void {
    const terminal: HTMLElement = this.terminalElementRef.nativeElement;
    new MutationObserver((): number => terminal.scrollTop = terminal.scrollHeight)
      .observe(terminal, {
        childList: true,
        subtree: true,
      });
  }

  private clear(): void {
    this.components.forEach((component: ComponentRef<{}>) => component.destroy());
    this.components = [];
  }

  private exec(str: string): void {
    const command: string = str.trim().split(' ')[0];

    this.loadComponent(CommandComponent, [this.prefix, str]);

    if (command.length > 0) {
      this.commands.push(str);
      this.caretIndex = 0;
      this.commandIndex = this.commands.length;

      switch (command) {

        case 'clear':
          this.clear();
          break;

        default:
          if (executors[command]) {
            this.loadComponent(executors[command], str.split(' ').slice(1));
          } else {
            this.loadComponent(BashErrorComponent, [command]);
          }
      }
    }
  }

  private loadComponent(component: Type<{}>, args: any[]): void {
    const componentFactory: ComponentFactory<{}> = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef: ComponentRef<{}> = this.commandsViewContainerRef.createComponent(componentFactory);
    (<Executor> componentRef.instance).args = args;
    this.components.push(componentRef);
  }

  private navigate(event: KeyboardEvent): void {
    switch (event.keyCode) {

      case KEY_CODE.BACK_SPACE:
        event.preventDefault();
        if (this.caretIndex > 0) {
          this.userInput = this.userInput.slice(0, this.caretIndex - 1) + this.userInput.slice(this.caretIndex);
          this.caretIndex--;
        }
        break;

      case KEY_CODE.ENTER:
        event.preventDefault();
        this.exec(this.userInput);
        this.userInput = '';
        break;

      case KEY_CODE.DOWN:
        event.preventDefault();
        if (this.commandIndex < (this.commands.length - 1)) {
          this.commandIndex++;
          this.userInput = this.commands[this.commandIndex];
          this.caretIndex = this.userInput.length;
        }
        break;

      case KEY_CODE.LEFT:
        event.preventDefault();
        if (this.caretIndex > 0) {
          this.caretIndex--;
        }
        break;

      case KEY_CODE.RIGHT:
        event.preventDefault();
        if (this.caretIndex < this.userInput.length) {
          this.caretIndex++;
        }
        break;

      case KEY_CODE.UP:
        event.preventDefault();
        if (this.commandIndex > 0) {
          this.commandIndex--;
          this.userInput = this.commands[this.commandIndex];
          this.caretIndex = this.userInput.length;
        }
    }
  }
}
