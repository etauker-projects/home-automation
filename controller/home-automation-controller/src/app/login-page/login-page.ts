import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-login-page',
  imports: [],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  redirecting = false;

  constructor() {}

  onLogin(event: Event) {
    console.log('button clicked, redirecting to login', event);
    this.redirecting = true;
    window.location.href = '/auth/login';
  }
}
