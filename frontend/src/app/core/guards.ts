import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session';

async function restored() {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.restore();
  return { session, router };
}

export const requireSession: CanActivateFn = async () => {
  const { session, router } = await restored();
  return session.user() ? true : router.parseUrl('/login');
};

export const requirePasswordChanged: CanActivateFn = async () => {
  const { session, router } = await restored();
  if (!session.user()) return router.parseUrl('/login');
  return session.user()!.mustChangePassword ? router.parseUrl('/password') : true;
};

export const requireAdmin: CanActivateFn = async () => {
  const { session, router } = await restored();
  if (!session.user()) return router.parseUrl('/login');
  if (session.user()!.mustChangePassword) return router.parseUrl('/password');
  return session.user()!.isAdmin ? true : router.parseUrl('/projects');
};

export const requireGuest: CanActivateFn = async () => {
  const { session, router } = await restored();
  if (!session.user()) return true;
  return router.parseUrl(session.user()!.mustChangePassword ? '/password' : '/projects');
};
