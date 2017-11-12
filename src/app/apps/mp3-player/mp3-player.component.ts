import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import * as moment from 'moment';

import { HTTP_PREFIX } from '../../env';
import { WindowComponent } from '../../platform/window/window.component';
import { WindowInstance } from '../../platform/window/window-instance';

const size = {
  min: {
    width: 330,
    height: 150
  },
  max: {
    width: 950,
    height: 530
  }
};

@Component({
  selector: 'app-mp3-player',
  templateUrl: './mp3-player.component.html',
  styleUrls: ['./mp3-player.component.scss']
})
export class Mp3PlayerComponent implements AfterContentInit, OnDestroy, OnInit, WindowInstance {
  static appName = 'MP3Player';
  static iconClass = 'fa-headphones';

  @ViewChild('audio') audioElementRef: ElementRef;
  @ViewChild('currentTime') currentTimeElementRef: ElementRef;
  @ViewChild('progressBar') progressElementRef: ElementRef;
  @ViewChild('source') sourceElementRef: ElementRef;
  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  audioElement: any;
  currentMusic: any = {};
  currentPath: string;

  items: any[] = [
    {name: 'Top 50', path: '/tracks'},
    {
      name: 'Genres',
      items: [
        {name: 'Classical', path: '/tracks/classical'},
        {name: 'Dance', path: '/tracks/dance'},
        {name: 'Electronic', path: '/tracks/electronic'},
        {name: 'Folk', path: '/tracks/folk'},
        {name: 'House', path: '/tracks/house'},
        {name: 'Metal', path: '/tracks/metal'},
        {name: 'Pop', path: '/tracks/pop'},
        {name: 'Reggae', path: '/tracks/reggae'},
        {name: 'Rock', path: '/tracks/rock'},
        {name: 'Soundtrack', path: '/tracks/soundtrack'}
      ]
    }
  ];

  musicList: any[] = [];
  playlist: any[] = [];
  progress = 0;
  random = false;
  repeat = false;
  seeking = false;
  showPlaylist = true;
  size: { width: number, height: number } = this.showPlaylist ? size.max : size.min;

  get title(): string {
    return this.showPlaylist ? Mp3PlayerComponent.appName : '';
  }

  private currentTimeInterval: any;

  constructor(private http: HttpClient, private renderer: Renderer2) {
  }

  async loadMusicList(path): Promise<any> {

    if (!path) {
      return;
    }

    this.currentPath = path;
    this.musicList = [];

    this.musicList = <any[]> await this.http
      .get(`${HTTP_PREFIX}/api/jamendo${path}`)
      .first()
      .toPromise();

    this.musicList.forEach(music => {
      return music.readableDuration = moment.utc(music.duration * 1000).format('mm:ss');
    });
  }

  next(): void {

    if (this.random) {
      return this.rand();
    }

    let newIndex = this.playlist.indexOf(this.currentMusic) + 1;

    if (newIndex >= this.playlist.length) {
      newIndex = 0;
    }

    const paused = this.audioElement.paused;

    this.loadMusic(this.playlist[newIndex]);

    if (!paused) {
      this.play();
    }
  }

  play(): void {
    if (this.audioElement.paused) {
      this.audioElement.play();
    } else {
      this.audioElement.pause();
    }
  }

  playMusic(music: any) {
    if (music !== this.currentMusic) {
      this.loadMusic(music);
    }
    this.play();
  }

  prev(): void {

    if (this.random) {
      return this.rand();
    }

    let newIndex = this.playlist.indexOf(this.currentMusic) - 1;

    if (newIndex < 0) {
      newIndex = this.playlist.length - 1;
    }

    const paused = this.audioElement.paused;

    this.loadMusic(this.playlist[newIndex]);

    if (!paused) {
      this.play();
    }
  }

  rand(): void {
    const newIndex = Math.round(this.playlist.length * Math.random());

    const paused = this.audioElement.paused;

    this.loadMusic(this.playlist[newIndex]);

    if (!paused) {
      this.play();
    }
  }

  startSeek(downEvent: MouseEvent): void {
    const progressBarWidth = this.progressElementRef.nativeElement.clientWidth;
    const dx = downEvent.offsetX - downEvent.clientX;

    this.seeking = true;
    this.setCurrentTime(downEvent.offsetX / progressBarWidth);

    const cancelMouseMove: () => void = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.setCurrentTime((moveEvent.clientX + dx) / progressBarWidth);
    });

    const cancelMouseUp: () => void = this.renderer.listen('window', 'mouseup', () => {
      this.seeking = false;
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  togglePlaylist(): void {
    this.showPlaylist = !this.showPlaylist;
    this.size = this.showPlaylist ? size.max : size.min;
  }

  private loadMusic(music: any): void {

    if (!this.playlist.includes(music)) {
      this.playlist = this.musicList.slice();
    }

    this.currentMusic = music;
    this.audioElement.load();
    this.progress = 0;
  }

  /**
   * @param {number} value 0 -> 1
   */
  private setCurrentTime(value: number) {
    const duration = this.audioElement.duration;
    this.audioElement.currentTime = Math.min(Math.round(value * duration), duration - 1);
  }

  ngAfterContentInit(): void {
    this.audioElement = this.audioElementRef.nativeElement;

    this.audioElement.addEventListener('ended', () => {
      if (!this.repeat) {
        this.next();
      }
      this.play();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.progress = Math.round(this.audioElement.currentTime / this.audioElement.duration * 10000) / 100;
    });

    let lastCurrentTimeSeconds = 0;

    this.currentTimeInterval = setInterval(() => {
      const currentTimeSeconds = Math.round(this.audioElement.currentTime);

      if (lastCurrentTimeSeconds !== currentTimeSeconds) {
        const currentTimeElem = this.currentTimeElementRef.nativeElement;
        currentTimeElem.innerText = moment.utc(currentTimeSeconds * 1000).format('mm:ss');
        lastCurrentTimeSeconds = currentTimeSeconds;
      }
    }, 100);
  }

  ngOnDestroy() {
    clearInterval(this.currentTimeInterval);
  }

  async ngOnInit() {
    await this.loadMusicList(this.items[0].path);
    this.loadMusic(this.musicList[0]);
  }
}
