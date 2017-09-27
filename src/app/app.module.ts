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
import { TerminalComponent } from './terminal/terminal.component';
import { WorkComponent } from './terminal/executors/work/work.component';

@NgModule({
  declarations: [
    AboutComponent,
    AppComponent,
    BashErrorComponent,
    CommandComponent,
    HelpComponent,
    ProjectsComponent,
    SkillsComponent,
    TerminalComponent,
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
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
