import { Component, OnInit } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { RestService } from './services/rest/rest.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'frontend';
  backendMessage = '';

  constructor(private rest: RestService) {}

  ngOnInit() {

    this.rest.getStatus().then((data) => this.backendMessage = data.status);

    // this.http.get<{ status: string, mode: string, time: string }>('http://localhost:9999/home-automation/v1/status').subscribe(
    //   (data) => this.backendMessage = data.status,
    //   (err) => {
    //     console.log(err);
    //     this.backendMessage = 'Error connecting to backend!';
    //   }
    // );
  }
}
