import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as moment from 'moment';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/toPromise';

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
    this.repositories = (<any[]> await this.http.get('https://api.github.com/users/josselinbuils/repos').first().toPromise())
      .sort((a: any, b: any) => new Date(a.pushed_at).getTime() - new Date(b.pushed_at).getTime())
      .map((repos: any) => {
        return {
          description: repos.description,
          language: repos.language,
          name: repos.name,
          updated: moment(repos.pushed_at).fromNow(),
          url: repos.html_url
        };
      });
  }
}
