import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../core/session';
import { Topbar } from './topbar';

describe('Topbar logout failure', () => {
  it('keeps the current route and shows an actionable error', async () => {
    const service = {
      user: signal({
        id: 'u1',
        username: 'mai',
        name: 'ใหม่',
        isAdmin: false,
        active: true,
        mustChangePassword: false,
      }),
      pending: signal(false),
      logout: async () => {
        throw new HttpErrorResponse({ status: 503 });
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SessionService, useValue: service }, provideRouter([])],
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[aria-label="ออกจากระบบ"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'กรุณาลองออกจากระบบอีกครั้ง',
    );
    expect(navigate).not.toHaveBeenCalledWith('/login');
  });
});
