import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AboutComponent } from './apps/terminal/executors/about/about.component';
import { AppComponent } from './app.component';
import { BashErrorComponent } from './apps/terminal/executors/bash-error/bash-error.component';
import { CommandComponent } from './apps/terminal/executors/command/command.component';
import { ContextMenuComponent } from './platform/context-menu/context-menu.component';
import { ContextMenuService } from './platform/context-menu/context-menu.service';
import { HelpComponent } from './apps/terminal/executors/help/help.component';
import { NotesComponent } from './apps/notes/notes.component';
import { ProjectsComponent } from './apps/terminal/executors/projects/projects.component';
import { RedditComponent } from './apps/reddit/reddit.component';
import { SkillsComponent } from './apps/terminal/executors/skills/skills.component';
import { TaskBarComponent } from './platform/task-bar/task-bar.component';
import { TeraviaComponent } from './apps/teravia/teravia.component';
import { TerminalComponent } from './apps/terminal/terminal.component';
import { WorkComponent } from './apps/terminal/executors/work/work.component';
import { WindowComponent } from './platform/window/window.component';
import { WindowManagerService } from './platform/window/window-manager.service';

@NgModule({
  declarations: [
    AboutComponent,
    AppComponent,
    BashErrorComponent,
    CommandComponent,
    ContextMenuComponent,
    HelpComponent,
    NotesComponent,
    ProjectsComponent,
    RedditComponent,
    SkillsComponent,
    TaskBarComponent,
    TeraviaComponent,
    TerminalComponent,
    WindowComponent,
    WorkComponent
  ],
  entryComponents: [
    AboutComponent,
    BashErrorComponent,
    CommandComponent,
    HelpComponent,
    NotesComponent,
    ProjectsComponent,
    RedditComponent,
    SkillsComponent,
    TeraviaComponent,
    TerminalComponent,
    WorkComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [ContextMenuService, WindowManagerService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
