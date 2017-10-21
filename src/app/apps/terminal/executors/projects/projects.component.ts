import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import * as moment from 'moment';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/toPromise';

const projects = [
  'MALVApi', 'MALViewer', 'MYOBotHub', 'MYOBotSite', 'pathFinding', 'pizzaDay', 'portfolio', 'reverseProxy', 'robot',
  'teravia', 'youbiSMS'
];

const previews = {
  pathFinding: {image: 'pathFinding.jpg'},
  MYOBotHub: {image: 'MYOBotHub.jpg'},
  MYOBotSite: {image: 'MYOBotSite.jpg'},
  teravia: {image: 'teravia.jpg'},
  youbiSMS: {image: 'youbiSMS.jpg'}
};

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {
  repositories: any[];

  constructor(private http: HttpClient) {
  }

  async ngOnInit() {
    this.repositories = (<any[]> await this.http.get('https://api.github.com/users/josselinbuils/repos')
      .first()
      .toPromise())
      .filter(repos => projects.indexOf(repos.name) !== -1)
      .sort((a: any, b: any) => new Date(a.pushed_at).getTime() - new Date(b.pushed_at).getTime())
      .map((repos: any) => {
        const reposData = previews[repos.name];
        return {
          description: repos.description,
          imageURL: reposData && reposData.image ? `assets/projects/${reposData.image}` : null,
          language: repos.language,
          name: repos.name,
          updated: moment(repos.pushed_at).fromNow(),
          url: repos.html_url
        };
      });
  }
}
