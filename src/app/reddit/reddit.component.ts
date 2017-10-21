import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import * as moment from 'moment';

import { WindowComponent } from '../window/window.component';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-reddit',
  templateUrl: './reddit.component.html',
  styleUrls: ['./reddit.component.css']
})
export class RedditComponent implements OnInit, WindowInstance {
  static iconClass = 'fa-reddit-alien';

  @ViewChild(WindowComponent) windowComponent: WindowComponent;

  data: any[];
  path: string;
  subreddit: string;
  subreddits = ['angularjs', 'CrappyDesign', 'docker', 'javascript', 'node', 'ProgrammerHumor', 'todayilearned'];

  // For dev environment
  private prefix = location.host.indexOf('localhost') === 0 ? 'http://localhost:9000' : '';

  constructor(private http: HttpClient) {
  }

  async load(path: string): Promise<any> {
    this.path = path;
    this.subreddit = path.indexOf('/r/') === 0 ? path.split('/')[2] : null;

    this.data = null;
    this.data = <any[]> await this.http
      .get(`${this.prefix}/api/reddit${path}`)
      .first()
      .toPromise();

    this.data.forEach(link => {
      link.since = moment(link.created_utc * 1000).fromNow();
      link.showSubreddit = path.indexOf('/r/') !== 0;

      if (link.preview && link.preview.enabled) {
        link.previewUrl = link.preview.images[0].resolutions[0].url;
      }
    });
  }

  ngOnInit() {
    this.load('/r/popular/hot');
  }
}
