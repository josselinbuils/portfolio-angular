import {
  AfterContentInit, Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, ElementRef, HostListener,
  OnInit, Type, ViewChild, ViewContainerRef
} from '@angular/core';

import { AboutComponent } from './executors/about/about.component';
import { BashErrorComponent } from './executors/bash-error/bash-error.component';
import { CommandComponent } from './executors/command/command.component';
import { Executor } from './executors/executor';
import { HelpComponent } from './executors/help/help.component';
import { ProjectsComponent } from './executors/projects/projects.component';
import { SkillsComponent } from './executors/skills/skills.component';
import { WorkComponent } from './executors/work/work.component';
import { WindowManagerService } from '../window-manager.service';
import { TeraviaComponent } from '../teravia/teravia.component';
import { WindowInstance } from '../window/window-instance';

enum KEY_CODE {
  BACK_SPACE = 8,
  DOWN = 40,
  ENTER = 13,
  K = 75,
  LEFT = 37,
  RIGHT = 39,
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
export class TerminalComponent extends WindowInstance implements AfterContentInit, OnInit {
  static iconClass = 'fa-terminal';

  @ViewChild('terminal') terminalElementRef: ElementRef;
  @ViewChild('commands', {read: ViewContainerRef}) commandsViewContainerRef: ViewContainerRef;

  contentStyle = {background: 'rgba(30, 30, 30, 0.9)'};
  prefix = 'user$';
  userInput = '';
  scrollTop: number;

  private caretIndex = 0;
  private commandIndex = 0;
  private commands: string[] = [];
  private components: ComponentRef<{}>[] = [];

  constructor(private componentFactoryResolver: ComponentFactoryResolver, private windowManagerService: WindowManagerService) {
    super();
  }

  private clear(): void {
    this.components.forEach((component: ComponentRef<{}>) => component.destroy());
    this.components = [];
  }

  private exec(str: string): void {
    const command = str.trim().split(' ')[0];

    this.loadComponent(CommandComponent, [this.prefix, str]);

    if (command.length > 0) {
      this.commands.push(str);
      this.caretIndex = 0;
      this.commandIndex = this.commands.length;

      switch (command) {

        case 'clear':
          this.clear();
          break;

        case 'flip':
          if (!this.contentStyle['transform']) {
            this.contentStyle['transform'] = 'rotate3d(0, 1, 0, 180deg)';
          } else {
            delete this.contentStyle['transform'];
          }
          break;

        case 'teravia':
          this.windowManagerService.openWindow(TeraviaComponent);
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

  private loadComponent(component: Type<{}>, args: any[]) {
    const componentFactory: ComponentFactory<{}> = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef: ComponentRef<{}> = this.commandsViewContainerRef.createComponent(componentFactory);
    (<Executor> componentRef.instance).args = args;
    this.components.push(componentRef);
  }

  @HostListener('window:keydown', ['$event'])
  keyboardListener(event: KeyboardEvent): void {

    if (!this.active) {
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      this.userInput = this.userInput.slice(0, this.caretIndex) + event.key + this.userInput.slice(this.caretIndex);
      this.caretIndex++;
    } else if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      switch (event.keyCode) {

        case KEY_CODE.BACK_SPACE:
          if (this.caretIndex > 0) {
            this.userInput = this.userInput.slice(0, this.caretIndex - 1) + this.userInput.slice(this.caretIndex);
            this.caretIndex--;
          }
          break;

        case KEY_CODE.ENTER:
          this.exec(this.userInput);
          this.userInput = '';
          break;

        case KEY_CODE.DOWN:
          event.preventDefault();
          if (this.commandIndex < (this.commands.length - 1)) {
            this.commandIndex++;
            this.userInput = this.commands[this.commandIndex];
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
          }
      }
    } else if (!event.altKey && (event.metaKey || event.ctrlKey) && event.keyCode === KEY_CODE.K) {
      event.preventDefault();
      this.clear();
    }
  }

  ngOnInit(): void {
    this.exec('about');
  }

  ngAfterContentInit(): void {
    const terminal = this.terminalElementRef.nativeElement;
    new MutationObserver(() => this.scrollTop = terminal.clientHeight)
      .observe(terminal, {
        childList: true,
        subtree: true
      });
  }
}
