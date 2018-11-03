import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { first } from 'rxjs/operators';

const projects = [
  'malv-api', 'mal-viewer', 'myo-bot-hub', 'myo-bot-site', 'path-finding', 'pizza-day', 'portfolio', 'reverse-proxy',
  'robot', 'teravia', 'youbi-sms',
];

const previews = {
  'path-finding': 'path-finding.jpg',
  'myo-bot-hub': 'myo-bot-hub.jpg',
  'myo-bot-site': 'myo-bot-site.jpg',
  teravia: 'teravia.jpg',
  'youbi-sms': 'youbi-sms.jpg',
};

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
})
export class ProjectsComponent implements OnInit {
  projects: Project[];

  constructor(private readonly http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    this.projects = (await this.http.get('https://api.github.com/users/josselinbuils/repos')
      .pipe(first())
      .toPromise() as Repos[])
      .filter(repos => projects.indexOf(repos.name) !== -1)
      .sort((a, b) => new Date(a.pushed_at).getTime() - new Date(b.pushed_at).getTime())
      .map(repos => {
        const res: Project = {
          description: repos.description,
          language: repos.language,
          name: repos.name,
          updated: moment(repos.pushed_at).fromNow(),
          url: repos.html_url,
        };

        if (typeof previews[repos.name] === 'string') {
          res.imageURL = `assets/projects/${previews[repos.name]}`;
        }

        return res;
      });
  }
}

interface Project {
  description: string;
  imageURL?: string;
  language: string;
  name: string;
  updated: string;
  url: string;
}

interface Repos {
  name: string;
  description: string;
  html_url: string;
  language: string;
  pushed_at: string;
}
