import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { HTTP_PREFIX } from '@portfolio/env';
import { WindowComponent, WindowInstance } from '@portfolio/platform/window';
import { get } from 'lodash';
import * as moment from 'moment';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-reddit',
  templateUrl: './reddit.component.html',
  styleUrls: ['./reddit.component.scss'],
})
export class RedditComponent implements OnInit, WindowInstance {
  static appName = 'Reddit';
  static iconClass = 'fa-reddit-alien';

  @ViewChild(WindowComponent) windowComponent!: WindowComponent;

  data?: any[];
  path?: string;
  subreddit?: string;
  subreddits = ['angularjs', 'CrappyDesign', 'docker', 'javascript', 'node', 'ProgrammerHumor', 'todayilearned'];
  title = RedditComponent.appName;

  constructor(private readonly http: HttpClient) {}

  async load(path: string): Promise<any> {
    this.path = path;
    this.subreddit = path.indexOf('/r/') === 0 ? path.split('/')[2] : '';

    this.data = <any[]> await this.http
      .get(`${HTTP_PREFIX}/api/reddit${path}`).pipe(
        first())
      .toPromise();

    this.data.forEach(link => {
      link.since = moment(link.created_utc * 1000).fromNow();
      link.showSubreddit = path.indexOf('/r/') !== 0 || path.split('/')[2] === 'popular';
      link.previewUrl = get(link, 'preview.images[0].resolutions[1].url');
    });
  }

  async ngOnInit(): Promise<void> {
    await this.load('/r/popular/hot');
  }
}
