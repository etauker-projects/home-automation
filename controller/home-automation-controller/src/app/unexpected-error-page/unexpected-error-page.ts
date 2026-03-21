import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unexpected-error-page',
  imports: [],
  templateUrl: './unexpected-error-page.html',
  styleUrls: ['./unexpected-error-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnexpectedErrorPage {
  message: string = 'An unexpected error occurred.';

  constructor(router: Router) {
    router.events.subscribe(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const messageParam = urlParams.get('message');
      if (messageParam) {
        this.message = decodeURIComponent(messageParam);
      }
    });
  }
}
