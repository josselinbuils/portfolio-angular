import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { WindowInstance } from '../window/window-instance';

@Component({
  selector: 'app-reddit',
  templateUrl: './reddit.component.html',
  styleUrls: ['./reddit.component.css']
})
export class RedditComponent extends WindowInstance implements OnInit {
  static iconClass = 'fa-reddit-alien';

  subreddits: any[] = [
    {name: 'javascript'},
    {name: 'angularjs'},
    {name: 'node'},
    {name: 'docker'},
    {name: 'ProgrammerHumor'}
  ];

  constructor(private http: HttpClient) {
    super();
  }

  ngOnInit() {
    this.subreddits.forEach(async subreddit => {
      subreddit.data = (
        <any[]> await this.http.get(`api/reddit/${subreddit.name}/top/week`)
          .first()
          .toPromise()
      ).slice(0, 5);

      subreddit.data.forEach(link => link.since = moment(link.created_utc * 1000).fromNow(true));
    });
  }
}
