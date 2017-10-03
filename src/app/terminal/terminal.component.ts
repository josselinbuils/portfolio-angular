import {
  AfterContentInit, Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, ElementRef, HostListener,
  OnInit, Renderer2,
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

const LIMIT_OFFSET = 1;

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css']
})
export class TerminalComponent implements AfterContentInit, OnInit {
  @ViewChild('content') contentElementRef: ElementRef;
  @ViewChild('terminal') terminalElementRef: ElementRef;
  @ViewChild('vc', {read: ViewContainerRef}) viewContainerRef: ViewContainerRef;

  userInput: string;
  contentSelectable: boolean;
  style: any;

  private commandIndex: number;
  private commands: string[];
  private components: ComponentRef<{}>[];
  private lastDisplayProperties: any;
  private terminal: HTMLElement;

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
    const xMin = -LIMIT_OFFSET;
    const yMin = -LIMIT_OFFSET;
    const maxWidth = window.innerWidth + 2 * LIMIT_OFFSET;
    const maxHeight = window.innerHeight + 2 * LIMIT_OFFSET;

    if (x === xMin && y === yMin && width === maxWidth && height === maxHeight) {
      const last = this.lastDisplayProperties;
      this.setSize(last.width, last.height);
      this.setPosition(last.x, last.y);
    } else {
      this.lastDisplayProperties = displayProperties;
      this.setPosition(xMin, yMin);
      this.setSize(maxWidth, maxHeight);
    }
  }

  startMove(downEvent: MouseEvent): void {

    if ((<HTMLElement> downEvent.target).className.indexOf('maximize') !== -1) {
      return;
    }

    const terminalBoundingRect: any = this.terminal.getBoundingClientRect();
    const dx: number = terminalBoundingRect.left - downEvent.clientX;
    const dy: number = terminalBoundingRect.top - downEvent.clientY;

    this.contentSelectable = false;

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.setPosition(moveEvent.clientX + dx, moveEvent.clientY + dy);
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
      this.setSize(this.terminal.clientWidth, this.terminal.clientHeight);
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

        case 'flip':
          if (!this.style['transform']) {
            this.style['transform'] = 'rotate3d(0, 1, 0, 180deg)';
          } else {
            delete this.style['transform'];
          }
          break;

        case 'rotate':
          this.style['animation'] = 'spinner 0.5s ease-out';
          setTimeout(() => delete this.style['animation'], 500);
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
    const componentFactory: ComponentFactory<{}> = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef: ComponentRef<{}> = this.viewContainerRef.createComponent(componentFactory);
    (<Executor> componentRef.instance).args = args;
    this.components.push(componentRef);
  }

  private setPosition(x: number, y: number): void {
    const xMin = -LIMIT_OFFSET;
    const yMin = -LIMIT_OFFSET;
    const xMax = window.innerWidth + LIMIT_OFFSET - this.style['width.px'];
    const yMax = window.innerHeight + LIMIT_OFFSET - this.style['height.px'];
    this.style['left.px'] = Math.min(Math.max(x, xMin), xMax);
    this.style['top.px'] = Math.min(Math.max(y, yMin), yMax);
  }

  private setSize(width: number, height: number): void {
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
    const content: HTMLElement = this.contentElementRef.nativeElement;

    this.terminal = this.terminalElementRef.nativeElement;

    const x: number = Math.round((window.innerWidth - this.terminal.clientWidth) * 0.5);
    const y: number = Math.round((window.innerHeight - this.terminal.clientHeight) * 0.2);

    this.setSize(this.terminal.clientWidth, this.terminal.clientHeight);
    this.setPosition(x, y);

    new MutationObserver(() => content.scrollTop = content.scrollHeight - content.clientHeight)
      .observe(content, {
        childList: true,
        subtree: true
      });
  }
}
