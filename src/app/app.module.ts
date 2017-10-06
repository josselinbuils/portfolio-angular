import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AboutComponent } from './terminal/executors/about/about.component';
import { AppComponent } from './app.component';
import { BashErrorComponent } from './terminal/executors/bash-error/bash-error.component';
import { CommandComponent } from './terminal/executors/command/command.component';
import { HelpComponent } from './terminal/executors/help/help.component';
import { ProjectsComponent } from './terminal/executors/projects/projects.component';
import { SkillsComponent } from './terminal/executors/skills/skills.component';
import { TaskBarComponent } from './task-bar/task-bar.component';
import { TerminalComponent } from './terminal/terminal.component';
import { WorkComponent } from './terminal/executors/work/work.component';
import { WindowComponent } from './window/window.component';
import { BrowserComponent } from './browser/browser.component';
import { WindowManagerService } from './window-manager.service';

@NgModule({
  declarations: [
    AboutComponent,
    AppComponent,
    BashErrorComponent,
    BrowserComponent,
    CommandComponent,
    HelpComponent,
    ProjectsComponent,
    SkillsComponent,
    TaskBarComponent,
    TerminalComponent,
    WindowComponent,
    WorkComponent
  ],
  entryComponents: [
    AboutComponent,
    BashErrorComponent,
    BrowserComponent,
    CommandComponent,
    HelpComponent,
    ProjectsComponent,
    SkillsComponent,
    TerminalComponent,
    WorkComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [WindowManagerService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
