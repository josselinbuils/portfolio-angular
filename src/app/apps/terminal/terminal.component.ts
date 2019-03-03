import {
  AfterContentInit, Component, ComponentFactoryResolver, ComponentRef, ElementRef, HostListener, OnInit, Type,
  ViewChild, ViewContainerRef,
} from '@angular/core';
import { WindowComponent, WindowInstance } from '@portfolio/platform/window';

import { AboutComponent } from './executors/about/about.component';
import { BashErrorComponent } from './executors/bash-error/bash-error.component';
import { BuildManagerComponent } from './executors/build-manager/build-manager.component';
import { CommandComponent } from './executors/command/command.component';
import { Executor } from './executors/executor';
import { HelpComponent } from './executors/help/help.component';
import { OpenComponent } from './executors/open/open.component';
import { ProjectsComponent } from './executors/projects/projects.component';
import { SkillsComponent } from './executors/skills/skills.component';
import { WorkComponent } from './executors/work/work.component';

enum KEY_CODE {
  C = 67,
  BACK_SPACE = 8,
  DOWN = 40,
  ENTER = 13,
  K = 75,
  LEFT = 37,
  RIGHT = 39,
  TAB = 9,
  UP = 38,
}

const executors = {
  about: AboutComponent,
  buildmanager: BuildManagerComponent,
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

  @ViewChild('commands', { read: ViewContainerRef }) commandsViewContainerRef!: ViewContainerRef;
  @ViewChild('terminal') terminalElementRef!: ElementRef<HTMLDivElement>;
  @ViewChild(WindowComponent) windowComponent!: WindowComponent;

  caretIndex = 0;
  prefix = 'user$';
  userInput = '';
  title = TerminalComponent.appName;
  waiting = false;

  private commandIndex = 0;
  private readonly commands: string[] = [];
  private components: ComponentRef<{}>[] = [];

  constructor(private readonly componentFactoryResolver: ComponentFactoryResolver) {}

  @HostListener('window:keydown', ['$event'])
  async keyboardListener(event: KeyboardEvent): Promise<void> {
    if (!this.windowComponent.active) {
      return;
    }

    if (!event.altKey && (event.metaKey || event.ctrlKey) && event.keyCode === KEY_CODE.C) {
      event.preventDefault();

      if (this.waiting) {
        this.killExecutor();
      } else {
        await this.loadComponent(CommandComponent, [this.prefix, this.userInput]);
        this.setUserInput('');
      }
    }

    if (this.waiting) {
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
      await this.navigate(event);
    }
  }

  async ngOnInit(): Promise<void> {
    await this.exec('about');
  }

  ngAfterContentInit(): void {
    const terminal = this.terminalElementRef.nativeElement;
    new MutationObserver(() => terminal.scrollTop = terminal.scrollHeight)
      .observe(terminal, {
        childList: true,
        subtree: true,
      });
  }

  private clear(): void {
    this.components.forEach(component => component.destroy());
    this.components = [];
  }

  private async exec(str: string): Promise<void> {
    const command = str.trim().split(' ')[0];

    await this.loadComponent(CommandComponent, [this.prefix, str]);

    if (command.length > 0) {
      this.commands.push(str);
      this.commandIndex = this.commands.length;

      switch (command) {

        case 'clear':
          this.clear();
          break;

        default:
          if (executors[command]) {
            try {
              await this.loadComponent(executors[command], str.split(' ').slice(1));
            } catch (error) {
              await this.loadComponent(BashErrorComponent, [command, error.message]);
            }
          } else {
            await this.loadComponent(BashErrorComponent, [command]);
          }
      }
    }
  }

  private killExecutor(): void {
    const componentRef = this.components[this.components.length - 1];
    const executor = componentRef.instance as Executor;

    if (executor.releaseDeferred !== undefined) {
      if (executor.onKill !== undefined) {
        executor.onKill();
      }
      executor.releaseDeferred.resolve();
    }
  }

  private async loadComponent(component: Type<{}>, args: any[]): Promise<void> {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.commandsViewContainerRef.createComponent(componentFactory);
    const instance = componentRef.instance as Executor;
    instance.args = args;
    this.components.push(componentRef);

    const releaseComponent = () => {
      this.waiting = false;
      componentRef.changeDetectorRef.detectChanges();
      componentRef.changeDetectorRef.detach();
    };

    if (instance.releaseDeferred !== undefined) {
      this.waiting = true;
      try {
        await instance.releaseDeferred.promise;
      } catch (error) {
        releaseComponent();
        throw error;
      }
    }
    releaseComponent();
  }

  private async navigate(event: KeyboardEvent): Promise<void> {
    const userInput = this.userInput;

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
        this.setUserInput('');
        await this.exec(userInput);
        break;

      case KEY_CODE.DOWN:
        event.preventDefault();
        if (this.commandIndex < this.commands.length) {
          this.commandIndex++;
          this.setUserInput(this.commandIndex < this.commands.length ? this.commands[this.commandIndex] : '');
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

      case KEY_CODE.TAB:
        event.preventDefault();

        if (userInput.length === 0) {
          return;
        }
        const command = Object.keys(executors).find(c => c.indexOf(userInput) === 0);

        if (command !== undefined) {
          this.setUserInput(command);
        }
        break;

      case KEY_CODE.UP:
        event.preventDefault();
        if (this.commandIndex > 0) {
          this.commandIndex--;
          this.setUserInput(this.commands[this.commandIndex]);
        }
    }
  }

  private setUserInput(input: string): void {
    this.userInput = input;
    this.caretIndex = this.userInput.length;
  }
}
