import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, OnInit, ViewChild } from '@angular/core';

import { HTTP_PREFIX } from '../../env';
import { WindowComponent } from '../../platform/window/window.component';
import { WindowInstance } from '../../platform/window/window-instance';

@Component({
  selector: 'app-mp3-player',
  templateUrl: './mp3-player.component.html',
  styleUrls: ['./mp3-player.component.css']
})
export class Mp3PlayerComponent implements AfterContentInit, OnInit, WindowInstance {
  static appName = 'MP3Player';
  static iconClass = 'fa-headphones';

  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  contentStyle = {
    background: 'rgba(0, 0, 0, 0.9)'
  };

  music: any = {};
  musics: any[] = [];
  progress: number;

  get isPaused(): boolean {
    return this.audioElement.paused;
  }

  titleStyle = {
    background: 'rgba(0, 0, 0, 0.9)',
    border: 'none',
    color: '#007ad8'
  };

  private audioElement: any;

  constructor(private http: HttpClient) {
  }

  next(): void {
    let newIndex = this.musics.indexOf(this.music) + 1;

    if (newIndex >= this.musics.length) {
      newIndex = 0;
    }

    this.loadMusic(this.musics[newIndex]);
    this.play();
  }

  play(): void {
    if (this.isPaused) {
      this.audioElement.play();
    } else {
      this.audioElement.pause();
    }
  }

  prev(): void {
    let newIndex = this.musics.indexOf(this.music) - 1;

    if (newIndex < 0) {
      newIndex = this.musics.length - 1;
    }

    this.loadMusic(this.musics[newIndex]);
    this.play();
  }

  private loadMusic(music: any): void {
    const source = <any> document.getElementsByTagName('source')[0];
    source.src = music.audio;
    this.audioElement.load();
    this.music = music;
    this.progress = 0;
  }

  ngAfterContentInit(): void {
    this.audioElement = document.getElementsByTagName('audio')[0];

    this.audioElement.addEventListener('timeupdate', () => {
      this.progress = this.audioElement.currentTime / this.audioElement.duration * 100;
    });
  }

  async ngOnInit(): Promise<any> {
    this.musics = <any[]> await this.http
      .get(`${HTTP_PREFIX}/api/jamendo/tracks`)
      .first()
      .toPromise();

    this.music = this.musics[0];
    this.loadMusic(this.music);

    console.log(this.music);
  }
}
