import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AboutComponent } from './executors/about/about.component';
import { BashErrorComponent } from './executors/bash-error/bash-error.component';
import { CommandComponent } from './executors/command/command.component';
import { HelpComponent } from './executors/help/help.component';
import { ProjectsComponent } from './executors/projects/projects.component';
import { SkillsComponent } from './executors/skills/skills.component';
import { WorkComponent } from './executors/work/work.component';

@NgModule({
  declarations: [
    AboutComponent,
    BashErrorComponent,
    CommandComponent,
    HelpComponent,
    ProjectsComponent,
    SkillsComponent,
    WorkComponent
  ],
  entryComponents: [
    AboutComponent,
    BashErrorComponent,
    CommandComponent,
    HelpComponent,
    ProjectsComponent,
    SkillsComponent,
    WorkComponent
  ],
  imports: [
    BrowserModule,
    // FormsModule,
    HttpClientModule
  ]
})
export class TerminalModule {
}
