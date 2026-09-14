import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { requireAdmin, requireGuest, requirePasswordChanged, requireSession } from './guards';
import { SessionService } from './session';

describe('route guards', () => {
  const router = { parseUrl: (url: string) => ({ url }) };
  let state: { user: null | { isAdmin: boolean; mustChangePassword: boolean } };
  let session: { restore: () => Promise<unknown>; user: () => typeof state.user };
  beforeEach(() => {
    state = { user: null };
    session = { restore: async () => null, user: () => state.user };
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: session },
        { provide: Router, useValue: router },
      ],
    });
  });
  async function run(guard: typeof requireSession): Promise<true | { url: string }> {
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as Promise<
      true | { url: string }
    >;
  }

  it('restores before deciding and sends anonymous users to login', async () => {
    let restored = false;
    session.restore = async () => {
      restored = true;
    };
    expect(((await run(requireSession)) as { url: string }).url).toBe('/login');
    expect(restored).toBe(true);
  });
  it('forces password change before authenticated pages', async () => {
    state.user = { isAdmin: true, mustChangePassword: true };
    expect(((await run(requirePasswordChanged)) as { url: string }).url).toBe('/password');
  });
  it('keeps the administration route company-admin only', async () => {
    state.user = { isAdmin: false, mustChangePassword: false };
    expect(((await run(requireAdmin)) as { url: string }).url).toBe('/projects');
    state.user.isAdmin = true;
    expect(await run(requireAdmin)).toBe(true);
  });
  it('redirects signed-in guests according to their password state', async () => {
    state.user = { isAdmin: false, mustChangePassword: true };
    expect(((await run(requireGuest)) as { url: string }).url).toBe('/password');
    state.user.mustChangePassword = false;
    expect(((await run(requireGuest)) as { url: string }).url).toBe('/projects');
  });
});
