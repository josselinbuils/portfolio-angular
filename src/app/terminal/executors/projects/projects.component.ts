import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    this.repositories = (<any[]> await this.http.get('https://api.github.com/users/josselinbuils/repos').first().toPromise());
  }
}
