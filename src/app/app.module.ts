import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TerminalComponent } from './terminal/terminal.component';
import { AboutComponent } from './terminal/executors/about/about.component';
import { CdComponent } from './terminal/executors/cd/cd.component';
import { CommandComponent } from './terminal/executors/command/command.component';
import { BashErrorComponent } from './terminal/executors/bash-error/bash-error.component';
import { LsComponent } from './terminal/executors/ls/ls.component';
import { HelpComponent } from './terminal/executors/help/help.component';
import { WorkComponent } from './terminal/executors/work/work.component';
import { ProjectsComponent } from './terminal/executors/projects/projects.component';

@NgModule({
  declarations: [
    AppComponent,
    TerminalComponent,
    AboutComponent,
    CdComponent,
    CommandComponent,
    BashErrorComponent,
    LsComponent,
    HelpComponent,
    WorkComponent,
    ProjectsComponent
  ],
  entryComponents: [
    AboutComponent,
    CdComponent,
    CommandComponent,
    BashErrorComponent,
    LsComponent,
    HelpComponent,
    WorkComponent,
    ProjectsComponent
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
