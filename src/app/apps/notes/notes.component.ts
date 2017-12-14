import { Component, ViewChild } from '@angular/core';

import { WindowInstance } from '../../platform/window/window-instance';
import { WindowComponent } from '../../platform/window/window.component';

const smileys: any = {
  ':D': '\uD83D\uDE00',
  ':)': '\uD83D\uDE03',
  ';)': '\uD83D\uDE09',
  ':(': '\uD83D\uDE12',
  ':p': '\uD83D\uDE1B',
  ';p': '\uD83D\uDE1C',
};

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
})
export class NotesComponent implements WindowInstance {
  static appName = 'Notes';
  static iconClass = 'fa-sticky-note';

  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  notes: string;
  title = NotesComponent.appName;

  constructor() {
    this.notes = localStorage.getItem('notes') || 'Hello there 😃';
  }

  saveNotes(): void {

    this.notes = Object.keys(smileys).reduce((notes: string, smiley: string) => {
      const escapedSmiley: string = smiley.replace(/([()[{*+.$^\\|?])/g, '\\$1');
      return notes.replace(new RegExp(escapedSmiley, 'gim'), smileys[smiley]);
    }, this.notes);

    localStorage.setItem('notes', this.notes);
  }
}
