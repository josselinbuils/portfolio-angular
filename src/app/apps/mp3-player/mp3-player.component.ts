import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import * as moment from 'moment';

import { HTTP_PREFIX } from '../../env';
import { WindowComponent } from '../../platform/window/window.component';
import { WindowInstance } from '../../platform/window/window-instance';

@Component({
  selector: 'app-mp3-player',
  templateUrl: './mp3-player.component.html',
  styleUrls: ['./mp3-player.component.css']
})
export class Mp3PlayerComponent implements AfterContentInit, OnDestroy, OnInit, WindowInstance {
  static appName = 'MP3Player';
  static iconClass = 'fa-headphones';

  @ViewChild('audio') audioElementRef: ElementRef;
  @ViewChild('currentTime') currentTimeElementRef: ElementRef;
  @ViewChild('progressBar') progressElementRef: ElementRef;
  @ViewChild('source') sourceElementRef: ElementRef;
  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  contentStyle = {
    background: 'rgba(0, 0, 0, 0.9)'
  };

  audioElement: any;
  music: any = {};
  musics: any[] = [];
  progress = 0;
  seeking = false;

  titleStyle = {
    background: this.contentStyle.background,
    border: 'none',
    color: 'inherit'
  };

  private currentTimeInterval: any;

  constructor(private http: HttpClient, private renderer: Renderer2) {
  }

  next(): void {
    let newIndex = this.musics.indexOf(this.music) + 1;

    if (newIndex >= this.musics.length) {
      newIndex = 0;
    }

    const paused = this.audioElement.paused;

    this.loadMusic(this.musics[newIndex]);

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

  prev(): void {
    let newIndex = this.musics.indexOf(this.music) - 1;

    if (newIndex < 0) {
      newIndex = this.musics.length - 1;
    }

    const paused = this.audioElement.paused;

    this.loadMusic(this.musics[newIndex]);

    if (!paused) {
      this.play();
    }
  }

  /**
   * @param {number} value 0 -> 1
   */
  private setCurrentTime(value: number) {
    const duration = this.audioElement.duration;
    this.audioElement.currentTime = Math.min(Math.round(value * duration), duration - 1);
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

  private loadMusic(music: any): void {
    this.sourceElementRef.nativeElement.src = music.audio;
    this.audioElement.load();
    this.music = music;
    this.music.readableDuration = moment.utc(this.music.duration * 1000).format('mm:ss');
    this.progress = 0;
  }

  ngAfterContentInit(): void {
    this.audioElement = this.audioElementRef.nativeElement;

    this.audioElement.addEventListener('ended', () => this.next());

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
