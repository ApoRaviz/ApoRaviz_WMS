import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session';
import { Password } from './password';

describe('forced password page logout failure', () => {
  it('keeps the password gate visible and offers a retry message', async () => {
    const service = {
      user: signal({
        id: 'u1',
        username: 'mai',
        name: 'ใหม่',
        isAdmin: false,
        active: true,
        mustChangePassword: true,
      }),
      pending: signal(false),
      logout: async () => {
        throw new HttpErrorResponse({ status: 503 });
      },
      changePassword: async () => {
        throw new Error('not used');
      },
    };
    const navigateByUrl = vi.fn(async () => true);
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: service },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    const fixture = TestBed.createComponent(Password);
    fixture.detectChanges();

    const logout = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes('ออกจากระบบ'),
    ) as HTMLButtonElement;
    logout.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'กรุณาลองออกจากระบบอีกครั้ง',
    );
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('เปลี่ยนรหัสผ่าน');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
