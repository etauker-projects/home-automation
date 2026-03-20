import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-logout-page',
  imports: [],
  templateUrl: './logout-page.html',
  styleUrl: './logout-page.scss',
})
export class LogoutPage implements OnInit {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Only redirect on the client side
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = '/auth/logout';
    }
  }
}
