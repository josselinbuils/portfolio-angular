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
  private lastDisplayProperties: any;

  constructor(private componentFactoryResolver: ComponentFactoryResolver, private renderer: Renderer2) {
    this.userInput = '';
    this.commandIndex = 0;
    this.commands = [];
    this.components = [];
    this.contentSelectable = true;
    this.style = {};
  }

  maximize(): void {
    const displayProperties = this.getDisplayProperties();
    const {x, y, width, height} = displayProperties;

    if (x === -1 && y === -1 && width === (window.innerWidth + 2) && height === (window.innerHeight + 2)) {
      const {lastX, lastY, lastWidth, lastHeight} = this.lastDisplayProperties;
      this.setDisplayProperties(lastX, lastY, lastWidth, lastHeight);
    } else {
      this.lastDisplayProperties = {lastX: x, lastY: y, lastWidth: width, lastHeight: height};
      this.setDisplayProperties(-1, -1, window.innerWidth + 2, window.innerHeight + 2);
    }
  }

  startMove(downEvent: MouseEvent): void {

    if ((<any> downEvent.target).classList.value.indexOf('maximize') !== -1) {
      return;
    }

    this.contentSelectable = false;

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.style['left.px'] += moveEvent.movementX;
      this.style['top.px'] += moveEvent.movementY;
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      this.contentSelectable = true;
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  startResize(): void {
    this.contentSelectable = false;

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.style['width.px'] += moveEvent.movementX;
      this.style['height.px'] += moveEvent.movementY;
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

  private getDisplayProperties(): any {
    return {
      x: this.style['left.px'],
      y: this.style['top.px'],
      width: this.style['width.px'],
      height: this.style['height.px']
    };
  }

  private loadComponent(component: Type<{}>, args: any[]) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.viewContainerRef.createComponent(componentFactory);
    (<Executor> componentRef.instance).args = args;
    this.components.push(componentRef);
  }

  private setDisplayProperties(x: number, y: number, width: number, height: number): void {
    this.style['left.px'] = x;
    this.style['top.px'] = y;
    this.style['width.px'] = width;
    this.style['height.px'] = height;
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

    const x = Math.round((window.innerWidth - terminal.clientWidth) * 0.5);
    const y = Math.round((window.innerHeight - terminal.clientHeight) * 0.2);

    this.setDisplayProperties(x, y, terminal.clientWidth, terminal.clientHeight);

    new MutationObserver(() => content.scrollTop = content.scrollHeight - content.clientHeight)
      .observe(content, {
        childList: true,
        subtree: true
      });
  }
}
