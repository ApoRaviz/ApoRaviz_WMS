import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  skipToMain(event: Event): void {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => document.getElementById('main-content')?.focus(), 0);
      }
    });
  }
}
