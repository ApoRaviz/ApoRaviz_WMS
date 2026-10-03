import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
export const requireProjectSetup: CanActivateFn = async (route) => {
  const session = inject(SessionService),
    router = inject(Router);
  await session.restore();
  if (!session.user()) return router.parseUrl('/login');
  if (session.user()!.mustChangePassword) return router.parseUrl('/password');
  return session.user()!.isAdmin ||
    session
      .projects()
      .some((p) => p.id === route.paramMap.get('projectId') && p.roleId === 'manager')
    ? true
    : router.parseUrl('/projects');
};
export const confirmSetupLeave: CanDeactivateFn<{ confirmLeave: () => Promise<boolean> }> = (
  component,
) => component.confirmLeave();
