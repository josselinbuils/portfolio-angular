import { HttpClient } from '@angular/common/http';
import { AfterContentInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { HTTP_PREFIX } from '@portfolio/env';
import { WindowComponent, WindowInstance } from '@portfolio/platform/window';
import dayjs from 'dayjs';
import { first } from 'rxjs/operators';

const size = {
  min: {
    width: 330,
    height: 150,
  },
  max: {
    width: 950,
    height: 530,
  },
};

@Component({
  selector: 'app-mp3-player',
  templateUrl: './mp3-player.component.html',
  styleUrls: ['./mp3-player.component.scss'],
})
export class Mp3PlayerComponent implements AfterContentInit, OnDestroy, OnInit, WindowInstance {
  static appName = 'MP3Player';
  static iconClass = 'fas fa-headphones';

  @ViewChild('audio') audioElementRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('currentTime') currentTimeElementRef!: ElementRef<HTMLDivElement>;
  @ViewChild('progressBar') progressElementRef!: ElementRef<HTMLDivElement>;
  @ViewChild('source') sourceElementRef!: ElementRef<HTMLSourceElement>;
  @ViewChild(WindowComponent) windowComponent!: WindowComponent;

  audioElement!: HTMLAudioElement;
  currentItem?: Item;
  currentMusic?: Music;

  items: Item[] = [
    { name: 'Top 50', path: '/tracks' },
    {
      name: 'Genres',
      items: [
        { name: 'Classical', path: '/tracks/classical' },
        { name: 'Dance', path: '/tracks/dance' },
        { name: 'Electronic', path: '/tracks/electronic' },
        { name: 'Folk', path: '/tracks/folk' },
        { name: 'House', path: '/tracks/house' },
        { name: 'Metal', path: '/tracks/metal' },
        { name: 'Pop', path: '/tracks/pop' },
        { name: 'Reggae', path: '/tracks/reggae' },
        { name: 'Rock', path: '/tracks/rock' },
        { name: 'Soundtrack', path: '/tracks/soundtrack' },
      ],
    },
  ];

  orders: { name: string; order: string }[] = [
    { name: 'Top All', order: 'popularity_total' },
    { name: 'Top Month', order: 'popularity_month' },
    { name: 'Top Week', order: 'popularity_week' },
  ];

  musicList: Music[] = [];
  playlist: Music[] = [];
  progress = 0;
  random = false;
  repeat = false;
  seeking = false;
  showPlaylist = true;
  size: { width: number; height: number } = this.showPlaylist ? size.max : size.min;

  get title(): string {
    return this.showPlaylist ? Mp3PlayerComponent.appName : '';
  }

  private currentTimeInterval?: number;

  constructor(private readonly http: HttpClient,
              private readonly renderer: Renderer2) {}

  async loadMusicList(item: Item, order: string = 'popularity_total'): Promise<void> {

    if (item === undefined || typeof item.path !== 'string') {
      return Promise.resolve();
    }

    this.currentItem = item;

    this.musicList = await this.http
      .get(`${HTTP_PREFIX}/api/jamendo${item.path}/${order}`)
      .pipe(first())
      .toPromise() as Music[];

    this.musicList.forEach(music => {
      music.readableDuration = dayjs(music.duration * 1000).format('mm:ss');
    });
  }

  async next(): Promise<void> {

    if (this.currentMusic === undefined) {
      return;
    }

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
      await this.play();
    }
  }

  ngAfterContentInit(): void {
    this.audioElement = this.audioElementRef.nativeElement;

    this.audioElement.addEventListener('ended', async () => {
      if (!this.repeat) {
        await this.next();
      }
      await this.play();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.progress = Math.round(this.audioElement.currentTime / this.audioElement.duration * 10000) / 100;
    });

    let lastCurrentTimeSeconds = 0;

    this.currentTimeInterval = window.setInterval(() => {
      const currentTimeSeconds = Math.round(this.audioElement.currentTime);

      if (lastCurrentTimeSeconds !== currentTimeSeconds) {
        const currentTimeElem = this.currentTimeElementRef.nativeElement;
        currentTimeElem.innerText = dayjs(currentTimeSeconds * 1000).format('mm:ss');
        lastCurrentTimeSeconds = currentTimeSeconds;
      }
    }, 100);
  }

  ngOnDestroy(): void {
    clearInterval(this.currentTimeInterval);
  }

  async ngOnInit(): Promise<void> {
    await this.loadMusicList(this.items[0]);
    this.loadMusic(this.musicList[0]);
  }

  async play(): Promise<void> {
    if (this.audioElement.paused) {
      await this.audioElement.play();
    } else {
      this.audioElement.pause();
    }
  }

  async playMusic(music: Music): Promise<void> {
    if (this.currentMusic === undefined || music.id !== this.currentMusic.id) {
      this.loadMusic(music);
    }
    await this.play();
  }

  async prev(): Promise<void> {

    if (this.currentMusic === undefined) {
      return;
    }

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
      await this.play();
    }
  }

  async rand(): Promise<void> {
    const newIndex = Math.round(this.playlist.length * Math.random());
    const paused = this.audioElement.paused;

    this.loadMusic(this.playlist[newIndex]);

    if (!paused) {
      await this.play();
    }
  }

  startSeek(downEvent: MouseEvent): void {
    const progressBarWidth = this.progressElementRef.nativeElement.clientWidth;
    const dx = downEvent.offsetX - downEvent.clientX;

    this.seeking = true;
    this.setCurrentTime(downEvent.offsetX / progressBarWidth);

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.setCurrentTime((moveEvent.clientX as number + dx) / progressBarWidth);
    });

    const cancelMouseUp = this.renderer.listen('window', 'mouseup', () => {
      this.seeking = false;
      cancelMouseMove();
      cancelMouseUp();
    });
  }

  togglePlaylist(): void {
    this.showPlaylist = !this.showPlaylist;
    this.size = this.showPlaylist ? size.max : size.min;
  }

  private loadMusic(music: Music): void {

    if (!this.playlist.includes(music)) {
      this.playlist = this.musicList.slice();
    }

    this.currentMusic = music;
    this.audioElement.load();
    this.progress = 0;
  }

  /**
   * @param value 0 -> 1
   */
  private setCurrentTime(value: number): void {
    const duration = this.audioElement.duration;
    this.audioElement.currentTime = Math.min(Math.round(value * duration), duration - 1);
  }
}

export interface Item {
  items?: Item[];
  name: string;
  path?: string;
}

interface Music {
  album_id: string;
  album_image: string;
  album_name: string;
  artist_id: string;
  artist_idstr: string;
  artist_name: string;
  audio: string;
  audiodownload: string;
  duration: number;
  id: string;
  image: string;
  license_ccurl: string;
  name: string;
  position: number;
  prourl: string;
  readableDuration: string;
  releasedate: string;
  shareurl: string;
  shorturl: string;
}
