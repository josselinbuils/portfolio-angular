import {
  AfterContentInit, Component, ComponentFactoryResolver, ComponentRef, ElementRef, HostListener, OnInit, Renderer2,
  Type, ViewChild,
  ViewContainerRef
} from '@angular/core';

import {AboutComponent} from './executors/about/about.component';
import {BashErrorComponent} from './executors/bash-error/bash-error.component';
import {CommandComponent} from './executors/command/command.component';
import {Executor} from './executors/executor';
import {HelpComponent} from './executors/help/help.component';
import {ProjectsComponent} from './executors/projects/projects.component';
import {SkillsComponent} from './executors/skills/skills.component';
import {WorkComponent} from './executors/work/work.component';

enum KEY_CODE {
  BACK_SPACE = 8,
  DOWN = 40,
  ENTER = 13,
  K = 75,
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
  @ViewChild('content', {read: ElementRef}) contentElementRef: ElementRef;
  @ViewChild('terminal', {read: ElementRef}) terminalElementRef: ElementRef;
  @ViewChild('vc', {read: ViewContainerRef}) viewContainerRef: ViewContainerRef;

  userInput: string;
  contentSelectable: boolean;
  style: any;

  private commandIndex: number;
  private commands: string[];
  private components: ComponentRef<{}>[];

  constructor(private componentFactoryResolver: ComponentFactoryResolver, private renderer: Renderer2) {
    this.userInput = '';
    this.commandIndex = 0;
    this.commands = [];
    this.components = [];
    this.contentSelectable = true;
    this.style = {};
  }

  startMove(): void {
    this.contentSelectable = false;

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (event: MouseEvent) => {
      this.style['left.px'] += event.movementX;
      this.style['top.px'] += event.movementY;
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      this.contentSelectable = true;
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  startResize(): void {
    this.contentSelectable = false;

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (event: MouseEvent) => {
      this.style['width.px'] += event.movementX;
      this.style['height.px'] += event.movementY;
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      const terminal = this.terminalElementRef.nativeElement;
      this.style['width.px'] = terminal.clientWidth;
      this.style['height.px'] = terminal.clientHeight;
      this.contentSelectable = true;
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  private clear(): void {
    this.components.forEach((component: ComponentRef<{}>) => component.destroy());
    this.components = [];
  }

  private exec(str: string): void {
    const command = str.trim().split(' ')[0];

    this.loadComponent(CommandComponent, [str]);

    if (command.length > 0) {
      this.commands.push(str);
      this.commandIndex = this.commands.length;

      switch (command) {

        case 'clear':
          this.clear();
          break;

        case 'teravia':
          window.open('/teravia');
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
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.viewContainerRef.createComponent(componentFactory);
    (<Executor> componentRef.instance).args = args;
    this.components.push(componentRef);
  }

  @HostListener('window:keydown', ['$event'])
  keyboardListener(event: KeyboardEvent): void {
    if (!event.altKey && !event.metaKey) {
      if (event.key.length === 1) {
        this.userInput += event.key;
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
    } else if (!event.altKey && event.metaKey && event.keyCode === KEY_CODE.K) {
      this.clear();
    }
  }

  ngOnInit(): void {
    this.exec('about');
  }

  ngAfterContentInit(): void {
    const content = this.contentElementRef.nativeElement;
    const terminal = this.terminalElementRef.nativeElement;

    this.style['left.px'] = Math.round((window.screen.width - terminal.clientWidth) * 0.5);
    this.style['top.px'] = Math.round((window.screen.height - terminal.clientHeight) * 0.15);
    this.style['width.px'] = terminal.clientWidth;
    this.style['height.px'] = terminal.clientHeight;

    new MutationObserver(() => content.scrollTop = content.scrollHeight - content.clientHeight)
      .observe(content, {
        childList: true,
        subtree: true
      });
  }
}
