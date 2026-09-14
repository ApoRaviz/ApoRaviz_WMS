import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DemoSession } from './demo-session';

// Demo navigation only. The eventual backend must enforce real authorization.
export const requireSession: CanActivateFn = () =>
  inject(DemoSession).user() ? true : inject(Router).parseUrl('/login');
export const requireProject: CanActivateFn = () => {
  const session = inject(DemoSession);
  const router = inject(Router);
  return !session.user() ? router.parseUrl('/login') : session.selected() ? true : router.parseUrl('/projects');
};
export const requireGuest: CanActivateFn = () =>
  inject(DemoSession).user() ? inject(Router).parseUrl('/projects') : true;
