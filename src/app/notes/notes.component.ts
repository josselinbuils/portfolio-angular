import { Component } from '@angular/core';
import { WindowInstance } from '../window/window-instance';

const smileys = {
  ':D': '\uD83D\uDE00',
  ':)': '\uD83D\uDE03',
  ';)': '\uD83D\uDE09',
  ':(': '\uD83D\uDE12',
  ':p': '\uD83D\uDE1B',
  ';p': '\uD83D\uDE1C'
};

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent extends WindowInstance {
  static iconClass = 'fa-sticky-note';

  notes: string;

  constructor() {
    super();
    this.notes = localStorage.getItem('notes');
  }

  saveNotes(): void {

    this.notes = Object.keys(smileys).reduce((notes, smiley) => {
      const escapedSmiley = smiley.replace(/([()[{*+.$^\\|?])/g, '\\$1');
      return notes.replace(new RegExp(escapedSmiley, 'gim'), smileys[smiley]);
    }, this.notes);

    localStorage.setItem('notes', this.notes);
  }
}
