import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { WindowModule } from 'app/platform/window/window.module';

import { AboutComponent } from './executors/about/about.component';
import { BashErrorComponent } from './executors/bash-error/bash-error.component';
import { CommandComponent } from './executors/command/command.component';
import { HelpComponent } from './executors/help/help.component';
import { OpenComponent } from './executors/open/open.component';
import { ProjectsComponent } from './executors/projects/projects.component';
import { SkillsComponent } from './executors/skills/skills.component';
import { WorkComponent } from './executors/work/work.component';
import { TerminalComponent } from './terminal.component';

@NgModule({
  declarations: [
    AboutComponent,
    BashErrorComponent,
    CommandComponent,
    HelpComponent,
    OpenComponent,
    ProjectsComponent,
    SkillsComponent,
    TerminalComponent,
    WorkComponent,
  ],
  entryComponents: [
    AboutComponent,
    BashErrorComponent,
    CommandComponent,
    HelpComponent,
    OpenComponent,
    ProjectsComponent,
    SkillsComponent,
    TerminalComponent,
    WorkComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    WindowModule,
  ],
  exports: [
    TerminalComponent,
  ],
})
export class TerminalModule {}
